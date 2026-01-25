import { useState } from 'react'
import axios from 'axios'

export default function VideoUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

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
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', file.name)

    setUploading(true)
    setProgress(0)

    try {
      await axios.post('/api/videos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setProgress(percentCompleted)
        }
      })

      setFile(null)
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
                onClick={() => setFile(null)}
                disabled={uploading}
                className="px-4 py-1.5 border border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 text-sm font-mono-brand tracking-wide"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
