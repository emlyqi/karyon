from .models import Video
from .utils import transcribe_video
import traceback

def process_video(video_id):
    """
    Background task to transcribe a video.
    Updates video status as it progresses.
    """
    try:
        # Get video from database
        video = Video.objects.get(id=video_id)
        
        # Update status
        video.status = 'transcribing'
        video.save()
        
        # Transcribe
        segments, audio_path = transcribe_video(video.file.path)
        
        # Save results
        video.transcript_data = segments
        video.audio_file = audio_path.replace('media/', '')  # Save relative path
        video.status = 'ready'
        video.save()
        
        print(f"✓ Video {video_id} transcribed successfully!")
        
    except Exception as e:
        # If anything fails, mark as failed
        print(f"✗ Error transcribing video {video_id}: {str(e)}")
        traceback.print_exc()
        
        video.status = 'failed'
        video.save()