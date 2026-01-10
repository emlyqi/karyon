from rest_framework import serializers
from .models import Video

class VideoSerializer(serializers.ModelSerializer):
    """Serializer for the Video model."""
    
    class Meta:
        model = Video
        fields = ['id', 'title', 'file', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']