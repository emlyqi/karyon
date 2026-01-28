from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VideoViewSet, FetchYouTubeMetadataView

router = DefaultRouter()
router.register(r'videos', VideoViewSet, basename='video')

urlpatterns = [
    path('', include(router.urls)),
    path('fetch-youtube-metadata/', FetchYouTubeMetadataView.as_view(), name='fetch-youtube-metadata'),
]