"""
URL configuration for karyon project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("videos.urls")),
]

# Serve media files
# For large-scale deployments, move to S3/R2 with django-storages instead.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Custom media view with explicit range request support for video seeking.
    import os, re as _re, mimetypes
    from django.http import FileResponse, HttpResponse, Http404
    from django.urls import re_path

    def serve_media(request, path):
        fullpath = os.path.join(settings.MEDIA_ROOT, path)
        if not os.path.isfile(fullpath):
            raise Http404
        content_type, _ = mimetypes.guess_type(fullpath)
        content_type = content_type or 'application/octet-stream'
        file_size = os.path.getsize(fullpath)

        range_header = request.META.get('HTTP_RANGE')
        if range_header:
            match = _re.match(r'bytes=(\d+)-(\d*)', range_header)
            if match:
                start = int(match.group(1))
                end = int(match.group(2)) if match.group(2) else file_size - 1
                end = min(end, file_size - 1)
                length = end - start + 1
                f = open(fullpath, 'rb')
                f.seek(start)
                response = HttpResponse(f.read(length), status=206, content_type=content_type)
                response['Content-Length'] = length
                response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
                response['Accept-Ranges'] = 'bytes'
                f.close()
                return response

        response = FileResponse(open(fullpath, 'rb'), content_type=content_type)
        response['Accept-Ranges'] = 'bytes'
        response['Content-Length'] = file_size
        return response

    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_media),
    ]