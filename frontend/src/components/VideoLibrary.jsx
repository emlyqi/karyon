import { useEffect, useState } from 'react'

export default function VideoLibrary({ videos, onSelectVideo, onRefresh }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [deleteSuccess, setDeleteSuccess] = useState(0)

  useEffect(() => {
    const hasProcessing = videos.some(v =>
      v.status !== 'ready' && v.status !== 'failed'
    )

    if (hasProcessing) {
      const interval = setInterval(() => {
        onRefresh()
      }, 3000)

      return () => {
        clearInterval(interval)
      }
    }
  }, [videos, onRefresh])

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      processing: 'bg-blue-50 text-blue-700 border-blue-200',
      ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      error: 'bg-red-50 text-red-700 border-red-200'
    }

    return (
      <span className={`px-2 py-0.5 text-xs border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
        {status}
      </span>
    )
  }

  const handleSelectVideo = (videoId, e) => {
    e.stopPropagation()
    setSelectedIds(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    )
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    const count = selectedIds.length
    if (!confirm(`Delete ${count} ${count === 1 ? 'video' : 'videos'}?`)) return

    try {
      const count = selectedIds.length
      await Promise.all(
        selectedIds.map(id => fetch(`/api/videos/${id}/`, { method: 'DELETE' }))
      )
      setSelectedIds([])
      setDeleteSuccess(count)
      setTimeout(() => setDeleteSuccess(0), 3000)
      onRefresh()
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete videos')
    }
  }

  if (videos.length === 0) {
    return (
      <div className="bg-white border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-gray-500">No videos yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 p-6 shadow-boxy">
      {deleteSuccess > 0 && (
        <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 flex items-center">
          <svg className="w-4 h-4 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-emerald-900">{deleteSuccess === 1 ? 'Video' : 'Videos'} deleted successfully.</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-slate-800 font-mono-brand tracking-wider uppercase">Library</h2>
        <div className="flex items-center space-x-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 font-mono-brand tracking-wide"
            >
              Delete ({selectedIds.length})
            </button>
          )}
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-sm bg-orange-600 text-white hover:bg-orange-700 flex items-center font-mono-brand tracking-wide transition-all hover:shadow-boxy-orange"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className={`border overflow-hidden transition-all shadow-boxy ${
              selectedIds.includes(video.id)
                ? 'border-orange-500 shadow-boxy-orange'
                : 'border-gray-200'
            } ${
              video.status === 'ready'
                ? 'cursor-pointer hover:border-orange-300 hover:shadow-boxy-hover hover:-translate-y-0.5'
                : 'opacity-75'
            }`}
            onClick={() => video.status === 'ready' && onSelectVideo(video.id)}
          >
            <div className="relative">
              <div className="aspect-video bg-gray-900 flex items-center justify-center overflow-hidden">
                {video.file ? (
                  <video
                    src={video.file}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                ) : video.status === 'failed' ? (
                  <div className="flex flex-col items-center space-y-2">
                    <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs text-gray-400">Processing failed</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {video.youtube_url && (
                      <span className="text-xs text-gray-400">Processing...</span>
                    )}
                  </div>
                )}
              </div>

              {video.youtube_url && (
                <a
                  href={video.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 left-2 bg-red-600 hover:bg-red-700 p-1.5 transition-all"
                  title="Watch on YouTube"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              )}

              <div className="absolute top-2 right-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(video.id)}
                  onChange={(e) => handleSelectVideo(video.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 border-gray-300 cursor-pointer"
                />
              </div>
            </div>

            <div className="p-3">
              <h3 className="text-xs text-gray-900 mb-2 truncate" title={video.title}>
                {video.title}
              </h3>

              <div className="flex items-center justify-between">
                {getStatusBadge(video.status)}
              </div>

              {video.status === 'processing' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 h-0.5">
                    <div className="bg-orange-500 h-0.5 animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
