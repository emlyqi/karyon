from .models import Video, TranscriptChunk
from .utils import transcribe_video, chunk_transcript
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
        video.save()
        
        # Chunk transcript and save chunks
        chunks = chunk_transcript(segments, target_duration=45)

        for idx, chunk in enumerate(chunks):
            TranscriptChunk.objects.create(
                video=video,
                chunk_id=idx,
                text=chunk['text'],
                start_time=chunk['start'],
                end_time=chunk['end']
            )

        video.status = 'ready'
        video.save()

        print(f"✓ Video {video_id} transcribed successfully!")
        
    except Exception as e:
        # If anything fails, mark as failed
        print(f"✗ Error transcribing video {video_id}: {str(e)}")
        traceback.print_exc()
        
        video.status = 'failed'
        video.save()