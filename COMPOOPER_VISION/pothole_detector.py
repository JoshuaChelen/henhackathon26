# -*- coding: utf-8 -*-
import os
import cv2
import asyncio
import time
from dotenv import load_dotenv
from ultralytics import YOLO
from supabase import create_async_client, AsyncClient

# --- 1. Supabase Config ---
load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

# Load the local model
model = YOLO("Yolov8-fintuned-on-potholes.pt")

# Global client placeholder
supabase = None

async def download_video_from_supabase(bucket_name, file_path):
    # Added timestamp to local filename to avoid local collisions
    local_filename = f"temp_{int(time.time())}_{file_path.replace('/', '_')}"
    try:
        print(f"📥 Downloading {file_path}...")
        res = await supabase.storage.from_(bucket_name).download(file_path)
        with open(local_filename, "wb") as f:
            f.write(res)
        return local_filename
    except Exception as e:
        print(f"❌ Download Error: {e}")
        return None

async def upload_image_to_supabase(local_file_path, storage_path):
    try:
        with open(local_file_path, 'rb') as f:
            # FIX: Added upsert=True to handle file collisions
            await supabase.storage.from_("processed_images").upload(
                path=storage_path,
                file=f,
                file_options={
                    "content-type": "image/jpeg",
                    "upsert": "true"  # Overwrites if file exists
                }
            )
        res = await supabase.storage.from_("processed_images").get_public_url(storage_path)
        return res
    except Exception as e:
        print(f"❌ Storage Upload Error: {e}")
        return None

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
                        "center": [round(sizes[i][0], 2), round(sizes[i][1], 2)]
                    }
    return best_hazard

async def update_supabase_db(source, hazard_data, image_url, status="completed"):
    payload = {
        "status": status,
        "confidence": hazard_data.get("confidence") if hazard_data else None,
        "location_xyxy": hazard_data.get("location_xyxy") if hazard_data else None,
        "width": hazard_data.get("width") if hazard_data else None,
        "height": hazard_data.get("height") if hazard_data else None,
        "center": hazard_data.get("center") if hazard_data else None,
        "image_url": image_url
    }
    await supabase.table("pothole_image_data").update(payload).eq("source_file", source).execute()

async def process_video_from_cloud(video_name):
    print(f"⚙️ Setting {video_name} to 'processing'...")
    await supabase.table("pothole_image_data").update({"status": "processing"}).eq("source_file", video_name).execute()

    local_path = await download_video_from_supabase("unprocessed_vids", video_name)
    if not local_path:
        await supabase.table("pothole_image_data").update({"status": "error"}).eq("source_file", video_name).execute()
        return

    cap = cv2.VideoCapture(local_path)
    global_best_hazard = None
    global_best_frame = None 
    
    print(f"🔍 Analyzing frames in {video_name}...")
    while cap.isOpened():
        success, frame = cap.read()
        if not success: break
        
        results = model(frame)
        current_best = extract_best_hazard(results)
        
        if current_best and (global_best_hazard is None or current_best['confidence'] > global_best_hazard['confidence']):
            global_best_hazard = current_best
            global_best_frame = results[0].plot()

    if global_best_hazard and global_best_frame is not None:
        # Added timestamp to local temp image to prevent file lock issues
        temp_img_name = f"best_{int(time.time())}_{video_name.replace('/', '_')}.jpg"
        cv2.imwrite(temp_img_name, global_best_frame)

        storage_path = f"detections/{video_name.replace('/', '_')}.jpg"
        public_url = await upload_image_to_supabase(temp_img_name, storage_path)

        await update_supabase_db(video_name, global_best_hazard, public_url, "completed")
        print(f"🏆 Processed {video_name} | Confidence: {global_best_hazard['confidence']}")

        if os.path.exists(temp_img_name): os.remove(temp_img_name)
    else:
        print(f"⚪ No potholes found in {video_name}.")
        await update_supabase_db(video_name, {}, None, "no_hazards_found")

    cap.release()
    if os.path.exists(local_path): os.remove(local_path)

def handle_new_upload(payload):
    data = payload.get('data', {})
    record = data.get('record', {})
    
    video_name = record.get('source_file')
    status = record.get('status')
    
    if video_name and status == "pending":
        print(f"\n✨ Valid Event! Starting: {video_name}")
        asyncio.create_task(process_video_from_cloud(video_name))

async def start_listening():
    global supabase
    print("🚀 Initializing Async Supabase Client...")
    supabase = await create_async_client(url, key)
    
    print("👂 Listening for 'pending' entries in 'pothole_image_data'...")
    channel = supabase.channel('pothole-realtime')
    channel.on_postgres_changes(
        event="*",
        schema="public",
        table="pothole_image_data",
        callback=handle_new_upload
    )
    await channel.subscribe()

    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    try:
        asyncio.run(start_listening())
    except KeyboardInterrupt:
        print("\n🛑 Worker stopped.")