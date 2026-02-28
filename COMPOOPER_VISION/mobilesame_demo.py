from ultralytics import SAM
import torch

# 1. Load the model (downloads mobile_sam.pt automatically)
model = SAM("mobile_sam.pt")

# 2. Check for ARM hardware acceleration
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Running on: {device}")

# 3. Run Inference
# 'points' are [x, y] coordinates; 'labels' 1=foreground, 0=background
results = model.predict(
    source="https://ultralytics.com/images/bus.jpg", 
    points=[[500, 370]], 
    labels=[1],
    device=device
)

# 4. Save or show results
results[0].show()  # Opens a window with the mask
results[0].save(filename="segmented_output.jpg")