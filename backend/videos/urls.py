from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import VideoViewSet, FetchYouTubeMetadataView, UserSettingsView, APIKeyView
from .auth_views import SignupView

router = DefaultRouter()
router.register(r'videos', VideoViewSet, basename='video')

urlpatterns = [
    path('', include(router.urls)),
    path('fetch-youtube-metadata/', FetchYouTubeMetadataView.as_view(), name='fetch-youtube-metadata'),
    path('auth/signup/', SignupView.as_view(), name='signup'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('settings/', UserSettingsView.as_view(), name='user-settings'),
    path('settings/api-key/', APIKeyView.as_view(), name='api-key'),
]