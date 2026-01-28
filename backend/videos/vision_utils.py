import cv2
import base64
import os
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile
from django.conf import settings
from openai import OpenAI

def extract_keyframes(video_path, threshold=15.0, min_interval=10.0):
    """
    Extract keyframes from video when visual content changes significantly.
    
    Args:
        video_path: Path to video file
        threshold: Percent of pixels that must change to count as keyframe (lower = more sensitive)
        min_interval: Minimum seconds between keyframes
    
    Returns:
        List of (timestamp, frame_bytes) tuples
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    keyframes = []
    prev_gray = None  # Store grayscale version of previous frame for comparison
    prev_keyframe_time = -min_interval  # Start negative so first frame can be captured
    
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        
        # ret is False when video ends
        if not ret:
            break
        
        timestamp = frame_idx / fps
        
        # Convert frame to grayscale and resize for faster processing
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray_small = cv2.resize(gray, (320, 180))
        
        should_capture = False
        
        # First frame: always capture
        if prev_gray is None:
            should_capture = True
        # Subsequent frames: check if enough time passed AND frame is different enough
        elif (timestamp - prev_keyframe_time) >= min_interval:
            # Calculate absolute difference between current and previous frame
            diff = cv2.absdiff(gray_small, prev_gray)
            
            # Calculate what percentage of total pixels changed
            non_zero_count = cv2.countNonZero(diff)
            total_pixels = gray_small.shape[0] * gray_small.shape[1]
            percent_changed = (non_zero_count / total_pixels) * 100
            
            if percent_changed > threshold:
                should_capture = True
        
        if should_capture:
            # Convert OpenCV BGR format to RGB for PIL
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Create PIL image from numpy array and save to bytes
            pil_img = Image.fromarray(rgb_frame)
            buffered = BytesIO()
            pil_img.save(buffered, format="JPEG", quality=85)
            
            # Add to keyframes list: (timestamp in seconds, image as bytes)
            keyframes.append((timestamp, buffered.getvalue()))
            
            prev_keyframe_time = timestamp
        
        prev_gray = gray_small
        frame_idx += 1
    
    cap.release()
    
    return keyframes

def analyze_frame(frame_bytes):
    """
    Send a frame to GPT-4o for visual analysis.
    
    Args:
        frame_bytes: JPEG image as bytes
    
    Returns:
        String description of visual content
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Encode image to base64
    frame_b64 = base64.b64encode(frame_bytes).decode('utf-8')

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": """Extract all visible educational content from this video frame:

                                1. TEXT: Any text, equations, formulas, or code shown (transcribe exactly)
                                2. VISUALS: Describe any diagrams, graphs, charts, or illustrations

                                Format:
                                TEXT: [exact text/equations/code, or "None"]
                                VISUALS: [description of diagrams/visuals, or "None"]

                                Be precise with equations - use notation like x^2, sqrt(), fractions, etc."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{frame_b64}"
                        }
                    }
                ]
            }
        ],
        max_tokens=500,
        temperature=0.2
    )

    return response.choices[0].message.content.strip()

def process_video_frames(video):
    """
    Extract and analyze all keyframes for a video.
    Creates VideoFrame objects in database.
    
    Args:
        video: Video model instance
    
    Returns:
        Number of frames extracted
    """
    from .models import VideoFrame # Import here to avoid circular dependency

    video_path = video.file.path
    keyframes = extract_keyframes(video_path, threshold=15.0, min_interval=10.0)
    
    frames_created = 0
    for timestamp, frame_bytes in keyframes:
        try:
            # Analyze frame with GPT-4o
            visual_context = analyze_frame(frame_bytes)

            # Skip if nothing useful found
            if visual_context.count("None") >= 2:
                continue
    
            # Create frame record
            frame = VideoFrame.objects.create(
                video=video,
                timestamp=timestamp,
                visual_context=visual_context
            )

            frames_created += 1
            
        except Exception as e:
            print(f"Error processing frame at {timestamp:.1f}s: {str(e)}")
            continue
    return frames_created