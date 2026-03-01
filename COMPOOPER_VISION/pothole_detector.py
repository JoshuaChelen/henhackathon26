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
    local_filename = "temp_input_video.mp4"
    try:
        with open(local_filename, "wb") as f:
            res = supabase.storage.from_(bucket_name).download(file_path)
            f.write(res)
        return local_filename
    except Exception as e:
        print(f"❌ Error downloading: {e}")
        return None

def upload_image_to_supabase(local_file_path, storage_path):
    """Uploads the annotated image to Supabase Storage and returns its URL."""
    try:
        with open(local_file_path, 'rb') as f:
            supabase.storage.from_("processed_images").upload(
                path=storage_path,
                file=f,
                file_options={"content-type": "image/jpeg"}
            )
        
        # Construct the public URL to save in the DB
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

def upload_to_supabase_db(source, hazard_data, image_url):
    """Pushes detection data including the new image link."""
    payload = {
        "source_file": source,
        "confidence": hazard_data["confidence"],
        "location_xyxy": hazard_data["location_xyxy"],
        "width": hazard_data["width"],
        "height": hazard_data["height"],
        "center": hazard_data["center"],
        "image_url": image_url # Make sure to add this column to your table!
    }
    supabase.table("pothole_image_data").insert(payload).execute()

def process_video_from_cloud(video_name):
    local_path = download_video_from_supabase("unprocessed_vids", video_name)
    if not local_path: return

    cap = cv2.VideoCapture(local_path)
    global_best_hazard = None
    global_best_frame = None # To store the image data
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success: break
        
        results = model(frame)
        current_best = extract_best_hazard(results)
        
        if current_best and (global_best_hazard is None or current_best['confidence'] > global_best_hazard['confidence']):
            global_best_hazard = current_best
            # Save the annotated image frame
            global_best_frame = results[0].plot()

    if global_best_hazard and global_best_frame is not None:
        # 1. Save frame locally temporarily
        temp_img_name = f"best_{video_name.split('.')[0]}.jpg"
        cv2.imwrite(temp_img_name, global_best_frame)

        # 2. Upload to Storage
        storage_path = f"detections/{temp_img_name}"
        public_url = upload_image_to_supabase(temp_img_name, storage_path)

        # 3. Upload to Database
        upload_to_supabase_db(video_name, global_best_hazard, public_url)
        
        print(f"🏆 Processed {video_name}. Image at: {public_url}")

        # Cleanup temp image
        if os.path.exists(temp_img_name): os.remove(temp_img_name)

    cap.release()
    if os.path.exists(local_path): os.remove(local_path)

if __name__ == "__main__":
    process_video_from_cloud("two_pothole.mp4")