import os
import cv2
import json
import time
from dotenv import load_dotenv
from ultralytics import YOLO
from supabase import create_client, Client

# --- 1. Supabase Setup ---
load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

model = YOLO("Yolov8-fintuned-on-potholes.pt")

def download_video_from_supabase(bucket_name, file_path):
    local_filename = f"temp_{int(time.time())}.mp4"
    try:
        print(f"📥 Downloading {file_path}...")
        with open(local_filename, "wb") as f:
            res = supabase.storage.from_(bucket_name).download(file_path)
            f.write(res)
        return local_filename
    except Exception as e:
        print(f"❌ Download Error: {e}")
        return None

def upload_image_to_supabase(local_file_path, storage_path):
    try:
        with open(local_file_path, 'rb') as f:
            supabase.storage.from_("processed_images").upload(
                path=storage_path,
                file=f,
                file_options={"content-type": "image/jpeg"}
            )
        res = supabase.storage.from_("processed_images").get_public_url(storage_path)
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

def update_supabase_db(source, hazard_data, image_url, status="completed"):
    """Updates the existing record instead of inserting a new one."""
    payload = {
        "status": status,
        "confidence": hazard_data.get("confidence") if hazard_data else None,
        "location_xyxy": hazard_data.get("location_xyxy") if hazard_data else None,
        "width": hazard_data.get("width") if hazard_data else None,
        "height": hazard_data.get("height") if hazard_data else None,
        "center": hazard_data.get("center") if hazard_data else None,
        "image_url": image_url
    }
    # Update the row that matches the source_file name
    supabase.table("pothole_image_data").update(payload).eq("source_file", source).execute()

def process_video_from_cloud(video_name):
    # 1. Immediately set status to 'processing'
    supabase.table("pothole_image_data").update({"status": "processing"}).eq("source_file", video_name).execute()

    local_path = download_video_from_supabase("unprocessed_vids", video_name)
    if not local_path:
        supabase.table("pothole_image_data").update({"status": "error"}).eq("source_file", video_name).execute()
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
        temp_img_name = f"best_{video_name.replace('/', '_')}.jpg"
        cv2.imwrite(temp_img_name, global_best_frame)

        storage_path = f"detections/{temp_img_name}"
        public_url = upload_image_to_supabase(temp_img_name, storage_path)

        # 2. Update existing row to 'completed'
        update_supabase_db(video_name, global_best_hazard, public_url, "completed")
        print(f"🏆 Best Detection: {global_best_hazard['confidence']} | URL: {public_url}")

        if os.path.exists(temp_img_name): os.remove(temp_img_name)
    else:
        # 3. Update status if nothing was found
        print(f"⚪ No potholes detected in {video_name}.")
        update_supabase_db(video_name, {}, None, "no_hazards_found")

    cap.release()
    if os.path.exists(local_path): os.remove(local_path)

def handle_new_upload(payload):
    new_record = payload.get('new')
    video_name = new_record.get('source_file')
    status = new_record.get('status')
    
    # Only process if the record is NEW and currently 'pending'
    if video_name and status == "pending":
        print(f"\n✨ New video detected! Processing: {video_name}")
        process_video_from_cloud(video_name)

def start_listening():
    print("🚀 Pothole Detection Worker is Active.")
    print("👂 Listening for 'pending' entries in 'pothole_image_data'...")
    
    channel = supabase.channel('pothole-realtime')
    channel.on(
        "postgres_changes",
        event="INSERT", # Website creates the row, worker hears it
        schema="public",
        table="pothole_image_data",
        callback=handle_new_upload
    ).subscribe()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down worker...")

if __name__ == "__main__":
    start_listening()