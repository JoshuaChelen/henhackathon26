from ultralytics import SAM
import torch
import cv2

def run_mobile_sam():
    # 1. Load MobileSAM
    # This downloads the lightweight 'mobile_sam.pt' automatically
    model = SAM("mobile_sam.pt")

    # 2. Set device to CPU
    # Standard PyTorch on Windows ARM (Snapdragon) doesn't use 'mps' or 'cuda'
    device = "cpu"
    print(f"Running on: {device}")

    # 3. Run Inference
    # retina_masks=True ensures the mask is sharp, not pixelated
    results = model.predict(
        source="https://ultralytics.com/images/bus.jpg", 
        points=[[500, 370]], 
        labels=[1],
        device=device,
        retina_masks=True 
    )

    # 4. Explicitly Plot the Mask
    for r in results:
        # r.plot() creates the image with the colored mask baked in
        # mask=True is the critical flag you were missing
        annotated_image = r.plot(boxes=True)

        # Save to your laptop
        cv2.imwrite("fixed_mask_output.jpg", annotated_image)
        
        # Display the result in a window
        cv2.imshow("MobileSAM Mask Result", annotated_image)
        print("Click on the image window and press any key to exit.")
        cv2.waitKey(0)
        cv2.destroyAllWindows()

if __name__ == "__main__":
    run_mobile_sam()