from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Video
from .serializers import VideoSerializer

class VideoViewSet(viewsets.ModelViewSet):
    """ViewSet for managing video uploads and retrievals."""
    
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        video = self.get_object()
        return Response({'status': video.status})