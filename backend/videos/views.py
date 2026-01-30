from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Video, ChatSession, ChatMessage
from .serializers import VideoSerializer, QuerySerializer
from .utils import answer_question
from concurrent.futures import ThreadPoolExecutor
from .tasks import process_video, process_youtube_video
from .youtube_utils import get_youtube_metadata

class VideoViewSet(viewsets.ModelViewSet):
    """ViewSet for managing video uploads and retrievals."""

    serializer_class = VideoSerializer

    def get_queryset(self):
        return Video.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Override create to trigger transcription after upload."""
        response = super().create(request, *args, **kwargs)

        # Get video ID and object from response
        video_id = response.data['id']
        video = Video.objects.get(id=video_id)

        # Get user's OpenAI API key
        from .encryption import decrypt
        profile = request.user.profile
        openai_key = None
        if profile.encrypted_openai_key:
            openai_key = decrypt(profile.encrypted_openai_key)

        # Start background processing
        executor = ThreadPoolExecutor(max_workers=1)

        # Check if it's a YouTube URL or file upload
        if video.youtube_url:
            executor.submit(process_youtube_video, video_id, openai_key)
        else:
            executor.submit(process_video, video_id, openai_key)

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
        
        # Get user's OpenAI API key
        from .encryption import decrypt
        from django.conf import settings as django_settings
        profile = request.user.profile
        openai_key = None
        if profile.encrypted_openai_key:
            openai_key = decrypt(profile.encrypted_openai_key)

        if not openai_key and not django_settings.OPENAI_API_KEY:
            error_msg = 'No OpenAI API key set. Add one in Settings.'
            session, _ = ChatSession.objects.get_or_create(video=video, user=request.user)
            ChatMessage.objects.create(session=session, role='user', content=question)
            ChatMessage.objects.create(session=session, role='assistant', content=error_msg)
            session.save()
            return Response({'error': error_msg}, status=400)

        # Get answer using RAG
        try:
            answer = answer_question(video, question, max_distance=max_distance, conversation_history=conversation_history, openai_key=openai_key)
        except Exception as e:
            error_msg = str(e) or 'Something went wrong. Please try again.'
            session, _ = ChatSession.objects.get_or_create(video=video, user=request.user)
            ChatMessage.objects.create(session=session, role='user', content=question)
            ChatMessage.objects.create(session=session, role='assistant', content=error_msg)
            session.save()
            return Response({'error': error_msg}, status=500)

        # Save user message + assistant response to DB
        session, _ = ChatSession.objects.get_or_create(video=video, user=request.user)
        ChatMessage.objects.create(session=session, role='user', content=question)
        ChatMessage.objects.create(session=session, role='assistant', content=answer['answer'], sources=answer)
        session.save()  # Update updated_at timestamp

        return Response(answer)

    @action(detail=True, methods=['get', 'delete'], url_path='chat')
    def chat(self, request, pk=None):
        """
        GET: Retrieve chat history for this video.
        DELETE: Clear chat history for this video.
        """
        video = self.get_object()

        if request.method == 'DELETE':
            ChatSession.objects.filter(video=video, user=request.user).delete()
            return Response({'status': 'Chat history cleared.'})

        # GET: return messages
        session = ChatSession.objects.filter(video=video, user=request.user).first()
        if not session:
            return Response({'messages': []})

        messages = session.messages.all().values('role', 'content', 'sources', 'created_at')
        return Response({'messages': list(messages)})

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

class UserSettingsView(APIView):
    """Get user settings (whether API key is set)."""

    def get(self, request):
        profile = request.user.profile
        return Response({
            'has_openai_key': bool(profile.encrypted_openai_key),
        })

class APIKeyView(APIView):
    """Set or remove the user's OpenAI API key."""

    def put(self, request):
        from .encryption import encrypt
        api_key = request.data.get('api_key', '').strip()
        if not api_key:
            return Response({'error': 'api_key is required.'}, status=400)
        profile = request.user.profile
        profile.encrypted_openai_key = encrypt(api_key)
        profile.save()
        return Response({'status': 'API key saved.'})

    def delete(self, request):
        profile = request.user.profile
        profile.encrypted_openai_key = ''
        profile.save()
        return Response({'status': 'API key removed.'})