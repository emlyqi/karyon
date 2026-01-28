import yt_dlp
import os
from django.conf import settings

def download_youtube_video(url, video_id):
    """
    Downloads a YouTube video and saves it to the media/videos/ directory.
    Returns the file path of the downloaded video.
    """
    output_dir = os.path.join(settings.MEDIA_ROOT, 'videos')
    os.makedirs(output_dir, exist_ok=True)

    # Configure yt_dlp options
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': os.path.join(output_dir, f'youtube_{video_id}_%(id)s.%(ext)s'),
        'quiet': False,
        'no_warnings': False,
        'merge_output_format': 'mp4',  # Merge into mp4 if downloading separate video+audio
        'extractor_args': {
            'youtube': {
                'player_client': ['android'],  # Use Android client which is more reliable
            }
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            video_filename = ydl.prepare_filename(info_dict)

            # Return relative path to MEDIA_ROOT
            relative_path = os.path.relpath(video_filename, settings.MEDIA_ROOT)
            return relative_path
    except Exception as e:
        raise Exception(f"Error downloading YouTube video: {str(e)}")
    
def get_youtube_metadata(url):
    """
    Fetches metadata for a YouTube video without downloading it.
    Returns a dictionary with title and duration.
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            title = info_dict.get('title', 'Unknown Title')
            duration = info_dict.get('duration', 0)  # Duration in seconds\
            thumbnail = info_dict.get('thumbnail', '')
            description = info_dict.get('description', '')
            return {
                'title': title,
                'duration': duration,
                'thumbnail': thumbnail,
                'description': description
            }
    except Exception as e:
        raise Exception(f"Error fetching YouTube metadata: {str(e)}")