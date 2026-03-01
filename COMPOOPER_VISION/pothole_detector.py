import os
import cv2
import json
import time
from dotenv import load_dotenv
from ultralytics import YOLO
from supabase import create_client, Client

# --- 1. Supabase Setup ---
# Ensure your .env file in the same directory contains SUPABASE_URL and SUPABASE_KEY
load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Load the local model
model = YOLO("Yolov8-fintuned-on-potholes.pt")

def download_video_from_supabase(bucket_name, file_path):
    """Downloads a video from Supabase Storage to a local file for processing."""
    local_filename = "temp_input_video.mp4"
    try:
        print(f"📥 Downloading {file_path} from bucket '{bucket_name}'...")
        with open(local_filename, "wb") as f:
            res = supabase.storage.from_(bucket_name).download(file_path)
            f.write(res)
        return local_filename
    except Exception as e:
        print(f"❌ Error downloading from Supabase: {e}")
        return None

def upload_image_to_supabase(local_file_path, storage_path):
    """Uploads the annotated image to Supabase Storage and returns its public URL."""
    try:
        with open(local_file_path, 'rb') as f:
            supabase.storage.from_("processed_images").upload(
                path=storage_path,
                file=f,
                file_options={"content-type": "image/jpeg"}
            )
        
        # Construct the public URL for frontend display
        res = supabase.storage.from_("processed_images").get_public_url(storage_path)
        return res
    except Exception as e:
        print(f"❌ Storage Upload Error: {e}")
        return None

def extract_best_hazard(results):
    """Parses YOLO results to find the detection with the highest confidence score."""
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

def upload_to_supabase_db(source, hazard_data, image_url):
    """Inserts the final detection data and image URL into the database table."""
    payload = {
        "source_file": source,
        "confidence": hazard_data["confidence"],
        "location_xyxy": hazard_data["location_xyxy"],
        "width": hazard_data["width"],
        "height": hazard_data["height"],
        "center": hazard_data["center"],
        "image_url": image_url 
    }
    # Update this table name if it differs in your Supabase project
    supabase.table("pothole_image_data").insert(payload).execute()

def process_video_from_cloud(video_name):
    """Main processing pipeline: Download -> YOLO Inference -> Upload Results."""
    local_path = download_video_from_supabase("unprocessed_vids", video_name)
    if not local_path: return

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
            global_best_frame = results[0].plot() # Capture annotated frame

    if global_best_hazard and global_best_frame is not None:
        # 1. Save frame locally temporarily
        temp_img_name = f"best_{video_name.replace('/', '_')}.jpg"
        cv2.imwrite(temp_img_name, global_best_frame)

        # 2. Upload to Storage
        storage_path = f"detections/{temp_img_name}"
        public_url = upload_image_to_supabase(temp_img_name, storage_path)

        # 3. Upload to Database
        upload_to_supabase_db(video_name, global_best_hazard, public_url)
        
        print(f"🏆 Best Detection: {global_best_hazard['confidence']} | URL: {public_url}")

        # Cleanup local image
        if os.path.exists(temp_img_name): os.remove(temp_img_name)
    else:
        print(f"⚪ No potholes detected in {video_name}.")

    cap.release()
    if os.path.exists(local_path): os.remove(local_path)

def handle_new_upload(payload):
    """Realtime callback that triggers when a new row is inserted into 'pothole_image_data'."""
    new_record = payload.get('new')
    video_name = new_record.get('source_file')
    
    if video_name:
        print(f"\n✨ New event detected! Processing: {video_name}")
        process_video_from_cloud(video_name)

def start_listening():
    """Starts the continuous listener loop."""
    print("🚀 Pothole Detection Worker is Active.")
    print("👂 Listening for new entries in 'pothole_image_data'...")
    
    # 1. Initialize Realtime channel
    channel = supabase.channel('pothole-realtime')
    
    # 2. Set up listener for INSERT events
    channel.on(
        "postgres_changes",
        event="INSERT",
        schema="public",
        table="pothole_image_data",
        callback=handle_new_upload
    ).subscribe()

    # 3. Keep thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down worker...")

if __name__ == "__main__":
    start_listening()