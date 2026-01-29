import yt_dlp
import os
from django.conf import settings
from urllib.parse import urlparse, parse_qs

def clean_youtube_url(url):
    """
    Extract video ID from YouTube URL and return clean URL.
    Handles various YouTube URL formats and strips unnecessary parameters.
    """
    parsed = urlparse(url)

    # Extract video ID from different URL formats
    if 'youtube.com' in parsed.netloc:
        # Format: youtube.com/watch?v=VIDEO_ID
        query = parse_qs(parsed.query)
        video_id = query.get('v', [None])[0]
    elif 'youtu.be' in parsed.netloc:
        # Format: youtu.be/VIDEO_ID
        video_id = parsed.path.strip('/')
    else:
        # Unknown format, return as-is
        return url

    if video_id:
        return f"https://www.youtube.com/watch?v={video_id}"
    return url

def download_youtube_video(url, video_id, processing_mode='both'):
    """
    Downloads a YouTube video and saves it to the media/videos/ directory.
    Returns the file path of the downloaded video.

    Args:
        url: YouTube URL
        video_id: Database video ID for filename
        processing_mode: 'audio', 'visual', or 'both' - determines what to download
    """
    # Clean URL to remove playlist and other unnecessary parameters
    url = clean_youtube_url(url)

    output_dir = os.path.join(settings.MEDIA_ROOT, 'videos')
    os.makedirs(output_dir, exist_ok=True)

    # Choose format based on processing mode
    if processing_mode == 'audio':
        # Audio only
        format_str = 'bestaudio[ext=m4a]/bestaudio/best'
        merge_format = 'm4a'
    elif processing_mode == 'visual':
        # Visual only
        format_str = 'bestvideo[ext=mp4]/bestvideo/best'
        merge_format = 'mp4'
    else:
        # Both
        format_str = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        merge_format = 'mp4'

    # Configure yt_dlp options
    ydl_opts = {
        'format': format_str,
        'outtmpl': os.path.join(output_dir, f'youtube_{video_id}_%(id)s.%(ext)s'),
        'quiet': False,
        'no_warnings': False,
        'merge_output_format': merge_format,
        'extractor_args': {
            'youtube': {
                'player_client': ['android'],
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
    # Clean URL to remove playlist and other unnecessary parameters
    url = clean_youtube_url(url)

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            title = info_dict.get('title', 'Unknown Title')
            duration = info_dict.get('duration', 0)  # Duration in seconds
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