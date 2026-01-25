import { useEffect, useState } from 'react'

export default function VideoLibrary({ videos, onSelectVideo, onRefresh }) {
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    const hasProcessing = videos.some(v =>
      v.status === 'uploaded' ||
      v.status === 'processing'
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
    if (!confirm(`Delete ${selectedIds.length} video(s)?`)) return

    try {
      await Promise.all(
        selectedIds.map(id => fetch(`/api/videos/${id}/`, { method: 'DELETE' }))
      )
      setSelectedIds([])
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
                : video.status === 'failed' || video.status === 'error'
                ? 'opacity-75 cursor-not-allowed'
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
                ) : (
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
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
