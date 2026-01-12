from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Video
from .serializers import VideoSerializer
from concurrent.futures import ThreadPoolExecutor
from .tasks import process_video

class VideoViewSet(viewsets.ModelViewSet):
    """ViewSet for managing video uploads and retrievals."""
    
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

    def create(self, request, *args, **kwargs):
        """Override create to trigger transcription after upload."""
        response = super().create(request, *args, **kwargs)
        
        # Get video ID from response
        video_id = response.data['id']

        # Start background transcription
        executor = ThreadPoolExecutor(max_workers=1)
        executor.submit(process_video, video_id)
        
        return response
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        video = self.get_object()
        return Response({'status': video.status})