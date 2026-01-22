from rest_framework import serializers
from .models import Video

class VideoSerializer(serializers.ModelSerializer):
    """Serializer for the Video model."""
    
    class Meta:
        model = Video
        fields = ['id', 'title', 'file', 'audio_file', 'status', 'transcript_data', 'created_at']
        read_only_fields = ['id', 'status', 'audio_file', 'transcript_data', 'created_at']

class QuerySerializer(serializers.Serializer):
    """Serializer for asking questions about a video transcript."""
    
    question = serializers.CharField(
        required=True,
        help_text="The question to ask about the video"
    )
    max_distance = serializers.FloatField(
        required=False,
        default=1.5,
        help_text="Maximum distance threshold for considering relevant results"
    )