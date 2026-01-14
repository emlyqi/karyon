from django.contrib import admin
from .models import Video, TranscriptChunk

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['title']
    readonly_fields = ['created_at']

@admin.register(TranscriptChunk)
class TranscriptChunkAdmin(admin.ModelAdmin):
    list_display = ['video', 'chunk_id', 'start_time', 'end_time']
    search_fields = ['text']
    list_filter = ['video']

    def text_preview(self, obj):
        return obj.text[:75] + '...' if len(obj.text) > 75 else obj.text
    text_preview.short_description = 'Text Preview'