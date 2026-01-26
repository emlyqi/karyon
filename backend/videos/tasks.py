from .models import Video, TranscriptChunk
from .utils import transcribe_video, chunk_transcript
import traceback
from .youtube_utils import download_youtube_video, get_youtube_metadata

def process_video(video_id):
    """
    Background task to process a video.
    Updates video status as it progresses.
    """
    try:
        video = Video.objects.get(id=video_id)

        video.status = 'transcribing'
        video.save()

        # Transcribe
        segments, audio_path = transcribe_video(video.file.path)

        video.transcript_data = segments
        video.audio_file = audio_path.replace('media/', '')
        video.save()

        video.status = 'chunking'
        video.save()

        # Chunk transcript
        chunks = chunk_transcript(segments, min_duration=15, max_duration=90, similarity_threshold=0.70)

        for idx, chunk in enumerate(chunks):
            TranscriptChunk.objects.create(
                video=video,
                chunk_id=idx,
                text=chunk['text'],
                start_time=chunk['start'],
                end_time=chunk['end'],
                segments=chunk.get('segments', [])
            )

        video.status = 'ready'
        video.save()

        print(f"Video {video_id} processed successfully!")

    except Exception as e:
        print(f"Error processing video {video_id}: {str(e)}")
        traceback.print_exc()

        video.status = 'failed'
        video.error_message = str(e)
        video.save()

def process_youtube_video(video_id):
    """
    Background task to download and process a YouTube video.
    """
    try:
        video = Video.objects.get(id=video_id)

        # Update status
        video.status = 'downloading'
        video.save()

        # Download YouTube video
        print(f"Downloading YouTube video: {video.youtube_url}")
        video_file_path = download_youtube_video(video.youtube_url, video_id)

        # Save downloaded file path to video object
        video.file = video_file_path
        video.save()

        print(f"Downloaded YouTube video to: {video_file_path}")

        # Proceed with normal processing
        process_video(video_id)

    except Exception as e:
        print(f"Error processing YouTube video {video_id}: {str(e)}")
        traceback.print_exc()

        video.status = 'failed'
        video.error_message = str(e)
        video.save()