from rest_framework import serializers
from .models import Video

class VideoSerializer(serializers.ModelSerializer):
    """Serializer for the Video model."""

    class Meta:
        model = Video
        fields = ['id', 'title', 'file', 'youtube_url', 'audio_file', 'status', 'processing_mode', 'transcript_data', 'error_message', 'created_at']
        read_only_fields = ['id', 'status', 'audio_file', 'transcript_data', 'error_message', 'created_at']

    def to_representation(self, instance):
        """Override to return relative URLs and normalize status for frontend."""
        data = super().to_representation(instance)
        if instance.file:
            data['file'] = instance.file.url
        if instance.audio_file:
            data['audio_file'] = instance.audio_file.url
        # Map internal statuses to frontend-friendly values
        if data['status'] not in ('ready', 'failed'):
            data['status'] = 'processing'
        return data

class QuerySerializer(serializers.Serializer):
    """Serializer for asking questions about a video transcript."""

    question = serializers.CharField(
        required=True,
        help_text="The question to ask about the video"
    )
    conversation_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Previous conversation messages for context"
    )
    max_distance = serializers.FloatField(
        required=False,
        default=1.5,
        help_text="Maximum distance threshold for considering relevant results"
    )
