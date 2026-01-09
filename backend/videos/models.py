from django.db import models
from django.core.validators import FileExtensionValidator

class Video(models.Model):
    """Represents an uploaded video and its processing status."""
    
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('transcribing', 'Transcribing'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    ]
    
    title = models.CharField(max_length=200)
    file = models.FileField(
        upload_to='videos/',
        validators=[FileExtensionValidator(allowed_extensions=['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'])]
    )  # Only accept video files
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    transcript_data = models.JSONField(null=True, blank=True)  # Store Whisper segments
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']  # Newest first
