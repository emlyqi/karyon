import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

export default function VideoUpload({ onUploadComplete }) {
  const [uploadMode, setUploadMode] = useState('file')
  const [file, setFile] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const abortControllerRef = useRef(null)
  const debounceTimerRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setTitle(e.dataTransfer.files[0].name)
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setTitle(e.target.files[0].name)
    }
  }

  const fetchYoutubeMetadata = async (url) => {
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      return
    }

    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    setFetchingMetadata(true)
    try {
      const response = await axios.post('/api/fetch-youtube-metadata/', {
        youtube_url: url
      }, {
        signal: abortControllerRef.current.signal
      })
      if (response.data.title) {
        setTitle(response.data.title)
      }
    } catch (error) {
      // Don't show error if request was aborted
      if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
        console.error('Failed to fetch metadata:', error)
        alert('Failed to fetch video info. Make sure the URL is valid.')
      }
    } finally {
      setFetchingMetadata(false)
    }
  }

  const handleYoutubeUrlChange = (e) => {
    const url = e.target.value
    setYoutubeUrl(url)
    setTitle('') // Clear title when URL changes

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Cancel previous fetch if URL is cleared or changed
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      setFetchingMetadata(false)
      return
    }

    // Debounce: Wait 800ms after user stops typing before fetching
    debounceTimerRef.current = setTimeout(() => {
      if (url && (url.includes('youtube.com/watch') || url.includes('youtu.be/'))) {
        fetchYoutubeMetadata(url)
      }
    }, 800)
  }

  const handleUpload = async () => {
    if (uploadMode === 'file' && !file) {
      alert('Please select a file')
      return
    }
    if (uploadMode === 'youtube' && !youtubeUrl) {
      alert('Please enter a YouTube URL')
      return
    }
    if (!title) {
      alert('Please enter a title')
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      if (uploadMode === 'file') {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', title)

        await axios.post('/api/videos/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setProgress(percentCompleted)
          }
        })
      } else {
        await axios.post('/api/videos/', {
          youtube_url: youtubeUrl,
          title: title
        })
      }

      setFile(null)
      setYoutubeUrl('')
      setTitle('')
      setProgress(0)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
      onUploadComplete()
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed: ' + (error.response?.data?.detail || error.message))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 p-6 shadow-boxy">
      {uploadSuccess && (
        <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 flex items-center">
          <svg className="w-4 h-4 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-emerald-900">Processing started. Check the library below for progress.</span>
        </div>
      )}

      <h2 className="text-base font-medium mb-4 text-slate-800 font-mono-brand tracking-wider uppercase">Upload</h2>

      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setUploadMode('file')}
          disabled={uploading}
          className={`px-4 py-1.5 text-sm font-mono-brand tracking-wide transition-all ${
            uploadMode === 'file'
              ? 'bg-orange-600 text-white shadow-boxy-orange'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          File Upload
        </button>
        <button
          onClick={() => setUploadMode('youtube')}
          disabled={uploading}
          className={`px-4 py-1.5 text-sm font-mono-brand tracking-wide transition-all ${
            uploadMode === 'youtube'
              ? 'bg-orange-600 text-white shadow-boxy-orange'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          YouTube Link
        </button>
      </div>

      {uploadMode === 'file' && (
        <div
          className={`border border-dashed p-10 text-center transition-colors ${
            dragActive
              ? 'border-orange-400 bg-orange-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
        <input
          type="file"
          id="video-upload"
          accept=".mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.m4v"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {!file ? (
          <label htmlFor="video-upload" className="cursor-pointer">
            <div className="flex flex-col items-center space-y-2">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-base text-gray-500">
                <button
                  type="button"
                  onClick={() => document.getElementById('video-upload').click()}
                  className="text-orange-600 hover:text-orange-800 underline"
                >
                  Click to upload
                </button>
                {' '}or drag and drop
              </p>
              <p className="text-sm text-gray-400">MP4, MOV, AVI, MKV, WebM, FLV, WMV, M4V</p>
            </div>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-base text-gray-700">{file.name}</p>
            </div>

            <input
              type="text"
              placeholder="Video title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-1.5 border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
            />

            {uploading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 h-1">
                  <div
                    className="bg-orange-500 h-1 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{progress}%</p>
              </div>
            )}

            <div className="flex space-x-3 justify-center">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-1.5 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:hover:bg-orange-600 disabled:hover:shadow-none text-sm font-mono-brand tracking-wide transition-all hover:shadow-boxy-orange"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => { setFile(null); setTitle('') }}
                disabled={uploading}
                className="px-4 py-1.5 border border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50 disabled:hover:border-gray-300 text-sm font-mono-brand tracking-wide"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {uploadMode === 'youtube' && (
        <div className="space-y-4 border border-gray-300 p-6">
          <div className="flex flex-col items-center space-y-4">
            <svg className="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>

            <div className="w-full space-y-2">
              <label className="block text-xs font-medium text-gray-700">YouTube URL</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={handleYoutubeUrlChange}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
              />
              {fetchingMetadata && (
                <p className="text-xs text-gray-500 mt-1">Fetching video info...</p>
              )}
              {title && !fetchingMetadata && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">✓ {title}</p>
              )}
            </div>

            {uploading && (
              <div className="w-full">
                <div className="w-full bg-gray-200 h-1 mb-2">
                  <div className="bg-orange-500 h-1 animate-pulse" style={{ width: '100%' }} />
                </div>
                <p className="text-xs text-gray-500 text-center">Processing YouTube link...</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleUpload}
                disabled={uploading || !youtubeUrl || !title}
                className="px-4 py-1.5 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:hover:bg-orange-600 text-sm font-mono-brand tracking-wide transition-all hover:shadow-boxy-orange"
              >
                {uploading ? 'Processing...' : 'Add Video'}
              </button>
              <button
                onClick={() => {
                  // Cancel any ongoing fetch
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                  }
                  setYoutubeUrl('')
                  setTitle('')
                  setFetchingMetadata(false)
                }}
                disabled={uploading || !youtubeUrl}
                className="px-4 py-1.5 border border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50 disabled:hover:border-gray-300 text-sm font-mono-brand tracking-wide"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
