# -*- coding: utf-8 -*-
import os
import cv2
import asyncio
import time
import traceback
from dotenv import load_dotenv
from ultralytics import YOLO
from supabase import create_async_client
from realtime import RealtimeSubscribeStates

# =========================
# Config / Globals
# =========================
load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY in environment (.env).")

# Load the local model (blocking)
model = YOLO("Yolov8-fintuned-on-potholes.pt")

supabase = None  # Async client, set in start_listening()


# =========================
# Helpers
# =========================
def now_s() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def safe_print_payload(payload):
    # Payloads can be large; print key fields first, then full payload.
    try:
        print(f"[{now_s()}] 🧾 Realtime payload keys:", list(payload.keys()))
        data = payload.get("data") or {}
        record = data.get("record") or {}
        old = data.get("old_record") or data.get("old") or {}
        print(
            f"[{now_s()}] 🧾 record.status={record.get('status')} "
            f"record.source_file={record.get('source_file')} "
            f"old.status={old.get('status')} "
            f"event={payload.get('eventType') or payload.get('event')}"
        )
        # Uncomment to dump full payload (can be noisy):
        # print(payload)
    except Exception:
        print(f"[{now_s()}] ⚠️ Failed to print payload safely.")
        traceback.print_exc()


def _log_task_result(task: asyncio.Task):
    try:
        task.result()
    except Exception as e:
        print(f"[{now_s()}] ❌ Background task crashed: {e}")
        traceback.print_exc()


# =========================
# Storage I/O
# =========================
async def download_video_from_supabase(bucket_name, file_path):
    local_filename = f"temp_{int(time.time())}_{file_path.replace('/', '_')}"
    try:
        print(f"[{now_s()}] 📥 Downloading {bucket_name}/{file_path} -> {local_filename}")
        res = await supabase.storage.from_(bucket_name).download(file_path)
        with open(local_filename, "wb") as f:
            f.write(res)
        return local_filename
    except Exception as e:
        print(f"[{now_s()}] ❌ Download Error: {e}")
        traceback.print_exc()
        return None


async def upload_image_to_supabase(local_file_path, storage_path):
    try:
        with open(local_file_path, "rb") as f:
            await supabase.storage.from_("processed_images").upload(
                path=storage_path,
                file=f,
                file_options={
                    "content-type": "image/jpeg",
                    "upsert": "true",
                },
            )
        public_url = await supabase.storage.from_("processed_images").get_public_url(storage_path)
        return public_url
    except Exception as e:
        print(f"[{now_s()}] ❌ Storage Upload Error: {e}")
        traceback.print_exc()
        return None


# =========================
# Detection / Extraction
# =========================
def extract_best_hazard(results):
    best_hazard = None
    max_conf = -1.0
    for result in results:
        if result.boxes is not None and len(result.boxes) > 0:
            confidences = result.boxes.conf.tolist()
            coords = result.boxes.xyxy.tolist()
            sizes = result.boxes.xywh.tolist()
            for i in range(len(confidences)):
                if confidences[i] > max_conf:
                    max_conf = confidences[i]
                    best_hazard = {
                        "confidence": round(confidences[i], 4),
                        "location_xyxy": [round(x, 2) for x in coords[i]],
                        "width": round(sizes[i][2], 2),
                        "height": round(sizes[i][3], 2),
                        "center": [round(sizes[i][0], 2), round(sizes[i][1], 2)],
                    }
    return best_hazard


def find_best_hazard_and_frame(local_path: str):
    """
    IMPORTANT: This runs in a thread via asyncio.to_thread().
    It must be synchronous and do only blocking OpenCV/YOLO work.
    """
    cap = cv2.VideoCapture(local_path)
    global_best_hazard = None
    global_best_frame = None

    frames = 0
    t0 = time.time()

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        frames += 1
        results = model(frame)  # blocking
        current_best = extract_best_hazard(results)

        if current_best and (
            global_best_hazard is None
            or current_best["confidence"] > global_best_hazard["confidence"]
        ):
            global_best_hazard = current_best
            global_best_frame = results[0].plot()

        # light progress print every ~150 frames
        if frames % 150 == 0:
            dt = time.time() - t0
            print(f"[{now_s()}] 🎞️ {frames} frames processed in {dt:.1f}s...")

    cap.release()
    return global_best_hazard, global_best_frame, frames


# =========================
# DB updates
# =========================
async def update_supabase_db(source, hazard_data, image_url, status="completed"):
    payload = {
        "status": status,
        "confidence": hazard_data.get("confidence") if hazard_data else None,
        "location_xyxy": hazard_data.get("location_xyxy") if hazard_data else None,
        "width": hazard_data.get("width") if hazard_data else None,
        "height": hazard_data.get("height") if hazard_data else None,
        "center": hazard_data.get("center") if hazard_data else None,
        "image_url": image_url,
    }
    await supabase.table("pothole_image_data").update(payload).eq("source_file", source).execute()


async def claim_pending_row(video_name: str) -> bool:
    """
    Atomically claim a pending job by flipping pending->processing
    only if it is still pending. Prevents double-processing by poller/realtime.
    Returns True if claimed, False otherwise.
    """
    try:
        resp = (
            await supabase.table("pothole_image_data")
            .update({"status": "processing"})
            .eq("source_file", video_name)
            .eq("status", "pending")
            .execute()
        )
        # If update matched rows, we claimed it.
        claimed = bool(resp.data)
        print(f"[{now_s()}] 🧷 claim_pending_row({video_name}) -> {claimed}")
        return claimed
    except Exception as e:
        print(f"[{now_s()}] ❌ claim_pending_row error: {e}")
        traceback.print_exc()
        return False


# =========================
# Processing pipeline
# =========================
async def process_video_from_cloud(video_name: str):
    try:
        print(f"[{now_s()}] ⚙️ Starting processing: {video_name}")

        # (Optional) If you want to ensure status flips even without claim logic, keep this:
        # await supabase.table("pothole_image_data").update({"status": "processing"}).eq("source_file", video_name).execute()

        local_path = await download_video_from_supabase("unprocessed_vids", video_name)
        if not local_path:
            await supabase.table("pothole_image_data").update({"status": "error"}).eq("source_file", video_name).execute()
            return

        print(f"[{now_s()}] 🔍 Analyzing frames in {video_name} (threaded)...")
        global_best_hazard, global_best_frame, frames = await asyncio.to_thread(
            find_best_hazard_and_frame, local_path
        )
        print(f"[{now_s()}] ✅ Finished inference on {video_name}: {frames} frames")

        if global_best_hazard and global_best_frame is not None:
            temp_img_name = f"best_{int(time.time())}_{video_name.replace('/', '_')}.jpg"
            cv2.imwrite(temp_img_name, global_best_frame)

            storage_path = f"detections/{video_name.replace('/', '_')}.jpg"
            public_url = await upload_image_to_supabase(temp_img_name, storage_path)

            await update_supabase_db(video_name, global_best_hazard, public_url, "completed")
            print(f"[{now_s()}] 🏆 Completed {video_name} | Confidence: {global_best_hazard['confidence']}")

            if os.path.exists(temp_img_name):
                os.remove(temp_img_name)
        else:
            print(f"[{now_s()}] ⚪ No potholes found in {video_name}.")
            await update_supabase_db(video_name, {}, None, "no_hazards_found")

        if os.path.exists(local_path):
            os.remove(local_path)

    except Exception as e:
        print(f"[{now_s()}] ❌ process_video_from_cloud crashed for {video_name}: {e}")
        traceback.print_exc()
        try:
            await supabase.table("pothole_image_data").update({"status": "error"}).eq("source_file", video_name).execute()
        except Exception:
            print(f"[{now_s()}] ❌ Failed to mark row error after crash.")
            traceback.print_exc()


# =========================
# Realtime callback
# =========================
def handle_new_upload(payload):
    safe_print_payload(payload)

    data = payload.get("data") or {}
    record = data.get("record") or {}

    video_name = record.get("source_file")
    status = record.get("status")

    # If your DB writes pending via UPDATE (not INSERT), change subscription event below.
    if video_name and status == "pending":
        print(f"[{now_s()}] ✨ Valid Event! Attempting to claim: {video_name}")

        async def _claim_and_process():
            claimed = await claim_pending_row(video_name)
            if not claimed:
                print(f"[{now_s()}] 💤 Skipping (already claimed or not pending): {video_name}")
                return
            t = asyncio.create_task(process_video_from_cloud(video_name))
            t.add_done_callback(_log_task_result)

        asyncio.create_task(_claim_and_process())


# =========================
# Failsafe poller
# =========================
async def poll_pending_loop():
    """
    If realtime drops, polling will still pick up pending rows.
    Also useful for debugging: confirms whether pending rows exist.
    """
    while True:
        try:
            resp = (
                await supabase.table("pothole_image_data")
                .select("source_file,status,created_at")
                .eq("status", "pending")
                .order("created_at", desc=False)
                .limit(25)
                .execute()
            )
            rows = resp.data or []
            if rows:
                print(f"[{now_s()}] 🧹 Poller sees {len(rows)} pending row(s).")
            for row in rows:
                video_name = row.get("source_file")
                if not video_name:
                    continue

                claimed = await claim_pending_row(video_name)
                if claimed:
                    print(f"[{now_s()}] 🧹 Poller claimed: {video_name}")
                    t = asyncio.create_task(process_video_from_cloud(video_name))
                    t.add_done_callback(_log_task_result)

        except Exception as e:
            print(f"[{now_s()}] ❌ Poller error: {e}")
            traceback.print_exc()

        await asyncio.sleep(3)


# =========================
# Startup / Realtime subscribe
# =========================
async def start_listening():
    global supabase
    print(f"[{now_s()}] 🚀 Initializing Async Supabase Client...")
    supabase = await create_async_client(SUPABASE_URL, SUPABASE_KEY)

    async def resubscribe():
        print(f"[{now_s()}] 👂 Subscribing to realtime channel...")
        channel = supabase.channel("pothole-realtime")

        # If your app inserts new rows as pending, keep INSERT.
        # If it updates existing rows to pending, use UPDATE.
        channel.on_postgres_changes(
            event="INSERT",
            schema="public",
            table="pothole_image_data",
            callback=handle_new_upload,
        )

        def on_subscribe(status, err):
            print(f"[{now_s()}] 📡 Realtime status: {status} err={err}")
            if status in (
                RealtimeSubscribeStates.CLOSED,
                RealtimeSubscribeStates.CHANNEL_ERROR,
                RealtimeSubscribeStates.TIMED_OUT,
            ):
                print(f"[{now_s()}] 🔁 Realtime dropped; resubscribing...")
                asyncio.create_task(resubscribe())

        await channel.subscribe(on_subscribe)

    await resubscribe()

    # Start poller as a safety net + debugging
    asyncio.create_task(poll_pending_loop())

    # Keep event loop alive
    while True:
        await asyncio.sleep(5)


if __name__ == "__main__":
    try:
        asyncio.run(start_listening())
    except KeyboardInterrupt:
        print(f"\n[{now_s()}] 🛑 Worker stopped.")