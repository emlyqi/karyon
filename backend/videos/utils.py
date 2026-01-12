from openai import OpenAI
from django.conf import settings
from pydub import AudioSegment
import os


def extract_audio(video_path, output_dir='media/audio'):
    """
    Extract audio from video file and save as MP3.
    Returns the path to the extracted audio file.
    """
    # Create audio directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate audio filename
    video_filename = os.path.basename(video_path)
    audio_filename = os.path.splitext(video_filename)[0] + '.mp3'
    audio_path = os.path.join(output_dir, audio_filename)
    
    # Extract audio
    video = AudioSegment.from_file(video_path)
    video.export(audio_path, format="mp3", bitrate="32k")  # Low bitrate for smaller files
    
    return audio_path


def transcribe_video(file_path):
    """
    Transcribe video using OpenAI Whisper API.
    Extracts audio first to reduce file size.
    Returns: (segments, audio_path)
    """
    # Extract audio from video
    audio_path = extract_audio(file_path)
    
    # Check file size (25MB limit)
    file_size = os.path.getsize(audio_path)
    max_size = 25 * 1024 * 1024  # 25MB
    
    if file_size > max_size:
        raise ValueError(f"Audio file too large: {file_size / 1024 / 1024:.1f}MB. Max: 25MB")
    
    # Transcribe the audio
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            response_format="verbose_json",
            timestamp_granularities=["segment"]
        )

    # Extract segments
    segments = []
    for seg in transcription.segments:
        segments.append({
            'text': seg.text,
            'start': seg.start,
            'end': seg.end
        })
    
    return segments, audio_path