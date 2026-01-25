from .models import Video, TranscriptChunk
from .utils import transcribe_video, chunk_transcript
import traceback

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
        video.save()
