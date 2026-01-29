import { useState, useEffect, useCallback, useMemo } from 'react'
import VideoLibrary from './components/VideoLibrary'
import VideoUpload from './components/VideoUpload'
import VideoChat from './components/VideoChat'

function App() {
  const [selectedVideoId, setSelectedVideoId] = useState(null)
  const [videos, setVideos] = useState([])
  // Persist chat history in localStorage (works in production - it's browser storage)
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('chatHistory')
    return saved ? JSON.parse(saved) : {}
  })

  const fetchVideos = useCallback(async () => {
    try {
      const response = await fetch('/api/videos/')
      const data = await response.json()
      setVideos(data)
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [])

  // Prevent page scroll when in chat view
  useEffect(() => {
    if (selectedVideoId != null) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [selectedVideoId])

  // Save chat history to localStorage whenever it changes
  const saveChatHistory = useCallback((videoId, messages) => {
    setChatHistory(prev => {
      const prevMessages = prev[videoId]
      // Only update if actually different
      if (JSON.stringify(prevMessages) === JSON.stringify(messages)) {
        return prev // Return same reference if nothing changed
      }
      const updated = { ...prev, [videoId]: messages }
      localStorage.setItem('chatHistory', JSON.stringify(updated))
      return updated
    })
  }, [])

  const selectedVideo = useMemo(() => videos.find(v => v.id === selectedVideoId), [videos, selectedVideoId]);

  const handleMessagesChange = useCallback((messages) => {
    saveChatHistory(selectedVideoId, messages)
  }, [selectedVideoId, saveChatHistory])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-orange-600">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H8L12 22L16 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
              </svg>
              <h1 className="text-sm font-bold text-white tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                KARYON
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {selectedVideoId == null ? (
          <div className="space-y-8">
            <VideoUpload onUploadComplete={fetchVideos} />
            <VideoLibrary
              videos={videos}
              onSelectVideo={setSelectedVideoId}
              onRefresh={fetchVideos}
            />
          </div>
        ) : (
          <VideoChat
            video={selectedVideo}
            onBack={() => setSelectedVideoId(null)}
            initialMessages={chatHistory[selectedVideoId] || []}
            onMessagesChange={handleMessagesChange}
          />
        )}
      </main>
    </div>
  )
}

export default App
