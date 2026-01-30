import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import api from './api'
import VideoLibrary from './components/VideoLibrary'
import VideoUpload from './components/VideoUpload'
import VideoChat from './components/VideoChat'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import SettingsPage from './components/SettingsPage'

function AppContent() {
  const { isAuthenticated, logout } = useAuth()
  const [authPage, setAuthPage] = useState('login')
  const [currentPage, setCurrentPage] = useState('home')
  const [selectedVideoId, setSelectedVideoId] = useState(null)
  const [videos, setVideos] = useState([])
  const [showKeyPrompt, setShowKeyPrompt] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [promptKey, setPromptKey] = useState('')
  const [promptSaving, setPromptSaving] = useState(false)
  const [promptMessage, setPromptMessage] = useState(null)

  // Reset prompt state when returning to key prompt screen
  useEffect(() => {
    if (showKeyPrompt) {
      setPromptKey('')
      setPromptMessage(null)
    }
  }, [showKeyPrompt])

  const fetchVideos = useCallback(async () => {
    try {
      const response = await api.get('/videos/')
      setVideos(response.data)
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchVideos()
      api.get('/settings/')
        .then(res => {
          if (!res.data.has_openai_key) {
            setShowKeyPrompt(true)
          }
          setSettingsLoaded(true)
        })
        .catch(() => {
          setSettingsLoaded(true)
        })
    }
  }, [isAuthenticated, fetchVideos])

  const handlePromptSave = async () => {
    if (!promptKey.trim()) return
    if (!promptKey.trim().startsWith('sk-') || promptKey.trim().length < 20) {
      setPromptMessage('Invalid API key. It should start with "sk-".')
      return
    }
    setPromptSaving(true)
    setPromptMessage(null)
    try {
      await api.put('/settings/api-key/', { api_key: promptKey })
      setShowKeyPrompt(false)
    } catch (err) {
      setPromptMessage(err.response?.data?.error || 'Failed to save.')
    } finally {
      setPromptSaving(false)
    }
  }

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

  // Show auth pages when not logged in
  if (!isAuthenticated) {
    if (authPage === 'signup') {
      return <SignupPage onSwitchToLogin={() => setAuthPage('login')} />
    }
    return <LoginPage onSwitchToSignup={() => setAuthPage('signup')} />
  }

  // Wait for settings check before rendering anything
  if (!settingsLoaded) {
    return <div className="min-h-screen bg-gray-50" />
  }

  const selectedVideo = videos.find(v => v.id === selectedVideoId)

  // First-time API key setup screen
  if (showKeyPrompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H8L12 22L16 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="#ea580c"/>
              </svg>
              <h1 className="text-lg font-bold text-slate-800 tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                KARYON
              </h1>
            </div>
            <h2 className="text-base font-medium text-slate-800 mb-1">Welcome!</h2>
            <p className="text-sm text-gray-500">One more thing before you get started.</p>
          </div>

          <div className="bg-white border border-gray-200 p-6 shadow-boxy">
            <h3 className="text-sm font-medium text-slate-800 mb-1">Add your OpenAI API key</h3>
            <p className="text-xs text-gray-500 mb-4">Karyon uses OpenAI to transcribe and analyze your videos. You can always change this later in Settings.</p>
            {promptMessage && (
              <p className="text-xs text-red-600 mb-3">{promptMessage}</p>
            )}
            <div className="flex gap-2 mb-4">
              <input
                type="password"
                value={promptKey}
                onChange={(e) => setPromptKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={handlePromptSave}
                disabled={promptSaving || !promptKey.trim()}
                className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 text-sm font-mono-brand tracking-wide transition-all hover:shadow-boxy-orange"
              >
                Save
              </button>
            </div>
            <button
              onClick={() => setShowKeyPrompt(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Skip for now — I'll add it in Settings later
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Settings page
  if (currentPage === 'settings') {
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
          <SettingsPage onBack={() => setCurrentPage('home')} />
        </main>
      </div>
    )
  }

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
            <div className="flex items-center gap-4">
              <button
                onClick={() => { if (confirm('Are you sure you want to sign out?')) logout() }}
                className="text-white/80 hover:text-white transition-colors text-sm font-mono-brand tracking-wide"
              >
                Sign Out
              </button>
              <button
                onClick={() => setCurrentPage('settings')}
                className="text-white/80 hover:text-white transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
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
          />
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
