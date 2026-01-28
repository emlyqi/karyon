from django.db import models
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError

class Video(models.Model):
    """Represents an uploaded video and its processing status."""
    
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('downloading', 'Downloading'),
        ('transcribing', 'Transcribing'),
        ('chunking', 'Chunking'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    ]
    
    title = models.CharField(max_length=200)
    file = models.FileField(
        upload_to='videos/',
        validators=[FileExtensionValidator(allowed_extensions=['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'])],
        blank=True,
        null=True
    )  # Only accept video files
    youtube_url = models.URLField(blank=True, null=True)  # Optional YouTube URL
    audio_file = models.FileField(upload_to='audio/', blank=True, null=True)  # Extracted audio for transcription
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    transcript_data = models.JSONField(null=True, blank=True)  # Store Whisper segments
    created_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True, null=True)  # Store error details if processing fails
    
    def __str__(self):
        return self.title
    
    def clean(self):
        """Ensure either a file or YouTube URL is provided, but not both."""
        if not self.file and not self.youtube_url:
            raise ValidationError("Either a video file or a YouTube URL must be provided.")
        if self.file and self.youtube_url:
            raise ValidationError("Provide either a video file or a YouTube URL, not both.")
    
    class Meta:
        ordering = ['-created_at']  # Newest first

class TranscriptChunk(models.Model):
    """Represents a chunk of transcribed text from a video."""

    video = models.ForeignKey(Video, related_name='chunks', on_delete=models.CASCADE)
    chunk_id = models.IntegerField()
    text = models.TextField()
    start_time = models.FloatField()  # Start time in seconds
    end_time = models.FloatField()    # End time in seconds
    segments = models.JSONField(default=list)
    embedding = models.JSONField(null=True, blank=True)  # Cached embedding vector
    
    def __str__(self):
        return f"{self.video.title} - Chunk {self.chunk_id}"
    
    class Meta:
        ordering = ['video', 'chunk_id']  # Order by start time
        unique_together = ['video', 'chunk_id']  # Ensure unique chunk IDs per video
