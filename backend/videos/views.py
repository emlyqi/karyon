from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Video
from .serializers import VideoSerializer, QuerySerializer
from .utils import answer_question 
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
    
    @action(detail=True, methods=['post'])
    def ask(self, request, pk=None):
        """
        Ask a question about the video using RAG.

        POST /api/videos/{id}/ask/
        Body: {"question": "What is X?"}
        """
        video = self.get_object()

        # Validate request
        serializer = QuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        question = serializer.validated_data['question']
        max_distance = serializer.validated_data.get('max_distance', 1.5)
        
        # Check if video is ready
        if video.status != 'ready':
            return Response(
                {'error': f'Video is not ready yet. Status: {video.status}'},
                status=400
            )
        
        # Get answer using RAG
        answer = answer_question(video, question, max_distance=max_distance)

        return Response(answer)