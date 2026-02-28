from ultralytics import YOLO
import cv2
from PIL import Image
import numpy as np

# Load the model
model = YOLO("Yolov8-fintuned-on-potholes.pt")
#"hf://cazzz307/Pothole-Finetuned-YoloV8"
# Single image inference
def detect_potholes_image(image_path, output_path=None):
    """
    Detect potholes in a single image
    
    Args:
        image_path (str): Path to input image
        output_path (str): Path to save annotated image (optional)
    
    Returns:
        results: Detection results
    """
    results = model(image_path)
    
    # Print detection results
    for result in results:
        boxes = result.boxes
        if boxes is not None:
            print(f"Found {len(boxes)} potholes")
            for box in boxes:
                confidence = box.conf[0].item()
                print(f"Pothole detected with confidence: {confidence:.2f}")
    
    # Save annotated image if output path provided
    if output_path:
        annotated_frame = results[0].plot()
        cv2.imwrite(output_path, annotated_frame)
        print(f"Annotated image saved to: {output_path}")
    
    return results

# Video inference
def detect_potholes_video(video_path, output_path=None):
    """
    Detect potholes in a video
    
    Args:
        video_path (str): Path to input video
        output_path (str): Path to save annotated video (optional)
    """
    cap = cv2.VideoCapture(video_path)
    
    # Get video properties for output
    if output_path:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_count = 0
    total_detections = 0
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
            
        # Run inference
        results = model(frame)
        
        # Count detections
        for result in results:
            if result.boxes is not None:
                total_detections += len(result.boxes)
        
        # Annotate frame
        annotated_frame = results[0].plot()
        
        # Save frame if output path provided
        if output_path:
            out.write(annotated_frame)
        
        # Display frame (optional)
        cv2.imshow("Pothole Detection", annotated_frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
            
        frame_count += 1
    
    cap.release()
    if output_path:
        out.release()
    cv2.destroyAllWindows()
    
    print(f"Processed {frame_count} frames")
    print(f"Total potholes detected: {total_detections}")

# Batch processing for multiple images
def detect_potholes_batch(image_folder, output_folder=None):
    """
    Process multiple images in a folder
    
    Args:
        image_folder (str): Path to folder containing images
        output_folder (str): Path to save annotated images (optional)
    """
    import os
    import glob
    
    image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.bmp', '*.tiff']
    image_files = []
    
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(image_folder, ext)))
        image_files.extend(glob.glob(os.path.join(image_folder, ext.upper())))
    
    total_detections = 0
    processed_images = 0
    
    for image_path in image_files:
        try:
            results = model(image_path)
            
            # Count detections
            for result in results:
                if result.boxes is not None:
                    total_detections += len(result.boxes)
                    print(f"{os.path.basename(image_path)}: {len(result.boxes)} potholes detected")
            
            # Save annotated image if output folder provided
            if output_folder:
                os.makedirs(output_folder, exist_ok=True)
                annotated_frame = results[0].plot()
                output_path = os.path.join(output_folder, f"annotated_{os.path.basename(image_path)}")
                cv2.imwrite(output_path, annotated_frame)
            
            processed_images += 1
            
        except Exception as e:
            print(f"Error processing {image_path}: {str(e)}")
    
    print(f"\nBatch processing complete:")
    print(f"Processed images: {processed_images}")
    print(f"Total potholes detected: {total_detections}")

# Example usage
if __name__ == "__main__":
    # Single image
    results = detect_potholes_image("pothole.jpg", "annotated_road.jpg")
    
    # Video processing
    # detect_potholes_video("road_video.mp4", "annotated_road_video.mp4")
    
    # Batch processing
    # detect_potholes_batch("road_images/", "annotated_images/")
