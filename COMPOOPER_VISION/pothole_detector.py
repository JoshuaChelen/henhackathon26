import os
import cv2
import json
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
    """Downloads a video from Supabase Storage to a local file."""
    local_filename = "temp_input_video.mp4"
    try:
        print(f"File path being requested: {file_path}")
        with open(local_filename, "wb") as f:
            # Note: .download() returns the raw bytes
            res = supabase.storage.from_(bucket_name).download(file_path)
            f.write(res)
        print(f"✅ Successfully downloaded {file_path} from Supabase.")
        return local_filename
    except Exception as e:
        print(f"❌ Error downloading from Supabase: {e}")
        return None

def extract_best_hazard(results):
    # (Same logic as your previous version)
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

def upload_to_supabase_db(source, hazard_data):
    """Pushes detection data to the 'potholes' table."""
    payload = {
        "source_file": source,
        "confidence": hazard_data["confidence"],
        "location_xyxy": hazard_data["location_xyxy"],
        "width": hazard_data["width"],
        "height": hazard_data["height"],
        "center": hazard_data["center"]
    }
    supabase.table("potholes").insert(payload).execute()

def process_video_from_cloud(video_name):
    # 1. Download from bucket
    # Assuming path is: unprocessed_vids/video_name.mp4
    local_path = download_video_from_supabase("unprocessed_vids", video_name)
    
    if not local_path:
        return

    # 2. Process locally
    cap = cv2.VideoCapture(local_path)
    global_best_hazard = None
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success: break
        
        results = model(frame)
        current_best = extract_best_hazard(results)
        
        if current_best and (global_best_hazard is None or current_best['confidence'] > global_best_hazard['confidence']):
            global_best_hazard = current_best

    # 3. Upload result to DB
    if global_best_hazard:
        upload_to_supabase_db(video_name, global_best_hazard)
        print(f"🏆 Best detection for {video_name} uploaded: {global_best_hazard['confidence']}")

    cap.release()
    # Clean up local temp file
    if os.path.exists(local_path):
        os.remove(local_path)

if __name__ == "__main__":
    # Pass just the filename string as requested
    process_video_from_cloud("two_pothole.mp4")