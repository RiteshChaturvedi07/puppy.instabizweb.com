import cv2
import os

video_path = r"C:\Users\RITESH CHATURVEDI\.gemini\antigravity\brain\1cd8decf-bb0f-425d-b3a9-eeb1775011b8\.user_uploaded\media_1793561415814_ca1fcf8d.mp4"
output_dir = r"C:\Users\RITESH CHATURVEDI\Downloads\puppy.instabizweb.com\video_frames_2"

os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps if fps > 0 else 0

print(f"FPS: {fps}, Total Frames: {total_frames}, Duration: {duration:.2f}s")

step = int(fps * 2.0) if fps > 0 else 30
frame_idx = 0
saved_count = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    if frame_idx % step == 0:
        sec = frame_idx / fps if fps > 0 else 0
        fn = os.path.join(output_dir, f"frame_{saved_count:03d}_{sec:.1f}s.jpg")
        cv2.imwrite(fn, frame)
        saved_count += 1
    frame_idx += 1

cap.release()
print(f"Saved {saved_count} frames to {output_dir}")

