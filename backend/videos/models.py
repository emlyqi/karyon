from django.db import models
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    """Stores per-user settings like their encrypted OpenAI API key."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    encrypted_openai_key = models.TextField(blank=True, default='')

    def __str__(self):
        return f"Profile for {self.user.email}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

class Video(models.Model):
    """Represents an uploaded video and its processing status."""

    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('downloading', 'Downloading'),
        ('transcribing', 'Transcribing'),
        ('chunking', 'Chunking'),
        ('scanning', 'Scanning'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    ]

    PROCESSING_MODE_CHOICES = [
        ('audio', 'Audio Only'),
        ('visual', 'Visual Only'),
        ('both', 'Audio + Visual'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='videos', null=True, blank=True)
    title = models.CharField(max_length=200)
    processing_mode = models.CharField(max_length=20, choices=PROCESSING_MODE_CHOICES, default='both')
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

class VideoFrame(models.Model):
    """Extracted keyframe with visual analysis."""

    video = models.ForeignKey(Video, related_name='frames', on_delete=models.CASCADE)
    timestamp = models.FloatField()  # Timestamp in seconds
    image = models.ImageField(upload_to='frames/', null=True, blank=True)
    visual_context = models.TextField() # GPT-4o vision analysis of the frame
    embedding = models.JSONField(null=True, blank=True)  # Embedding of visual_context text

    def __str__(self):
        return f"{self.video.title} - Frame at {self.timestamp:.1f}s"

    class Meta:
        ordering = ['video', 'timestamp']  # Order by timestamp

class ChatSession(models.Model):
    """A chat conversation about a specific video."""
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='chat_sessions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['video', 'user']

    def __str__(self):
        return f"Chat: {self.user.email} - {self.video.title}"

class ChatMessage(models.Model):
    """A single message in a chat session."""
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10)  # 'user' or 'assistant'
    content = models.TextField()
    sources = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"