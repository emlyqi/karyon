from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Video
from .serializers import VideoSerializer, QuerySerializer
from .utils import answer_question
from concurrent.futures import ThreadPoolExecutor
from .tasks import process_video, process_youtube_video
from .youtube_utils import get_youtube_metadata

@method_decorator(csrf_exempt, name='dispatch')
class VideoViewSet(viewsets.ModelViewSet):
    """ViewSet for managing video uploads and retrievals."""
    
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

    def create(self, request, *args, **kwargs):
        """Override create to trigger transcription after upload."""
        response = super().create(request, *args, **kwargs)
        
        # Get video ID and object from response
        video_id = response.data['id']
        video = Video.objects.get(id=video_id)

        # Start background processing
        executor = ThreadPoolExecutor(max_workers=1)

        # Check if it's a YouTube URL or file upload
        if video.youtube_url:
            executor.submit(process_youtube_video, video_id)
        else:
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
        conversation_history = serializer.validated_data.get('conversation_history', [])
        
        # Check if video is ready
        if video.status != 'ready':
            return Response(
                {'error': f'Video is not ready yet. Status: {video.status}'},
                status=400
            )
        
        # Get answer using RAG
        answer = answer_question(video, question, max_distance=max_distance, conversation_history=conversation_history)

        return Response(answer)

@method_decorator(csrf_exempt, name='dispatch')
class FetchYouTubeMetadataView(APIView):
    """Standalone view to fetch YouTube metadata."""

    def post(self, request):
        youtube_url = request.data.get('youtube_url')
        if not youtube_url:
            return Response({'error': 'youtube_url is required'}, status=400)

        try:
            metadata = get_youtube_metadata(youtube_url)
            return Response(metadata)
        except Exception as e:
            return Response({'error': str(e)}, status=400)