import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../AuthContext'

export default function SettingsPage({ onBack }) {
  const { user, logout } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    api.get('/settings/')
      .then(res => setHasKey(res.data.has_openai_key))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!message || message.type === 'error') return
    const timer = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [message])

  const handleSave = async () => {
    if (!apiKey.trim()) return
    if (!apiKey.trim().startsWith('sk-') || apiKey.trim().length < 20) {
      setMessage({ type: 'error', text: 'Invalid API key. It should start with "sk-".' })
      return
    }
    setSaving(true)
    setMessage(null)

    try {
      await api.put('/settings/api-key/', { api_key: apiKey })
      setHasKey(true)
      setApiKey('')
      setMessage({ type: 'success', text: 'API key saved.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove your API key?')) return
    setSaving(true)
    setMessage(null)

    try {
      await api.delete('/settings/api-key/')
      setHasKey(false)
      setMessage({ type: 'success', text: 'API key removed.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-medium text-slate-800 font-mono-brand tracking-wider uppercase">Settings</h2>
      </div>

      <div className="bg-white border border-gray-200 p-6 shadow-boxy space-y-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">Signed in as</p>
          <p className="text-sm text-gray-900">{user?.email}</p>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-800 mb-3">OpenAI API Key</h3>

          {message && message.type === 'success' && (
            <div className="mb-3 border-l-4 p-3 bg-emerald-50 border-emerald-500">
              <span className="text-xs text-emerald-700">{message.text}</span>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <span className="text-xs text-gray-600">
                  {hasKey ? 'API key is set' : 'No API key set'}
                </span>
              </div>
              {message && message.type === 'error' && (
                <p className="text-xs text-red-600 mb-2">{message.text}</p>
              )}

              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? 'Enter new key to replace' : 'sk-...'}
                  className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !apiKey.trim()}
                  className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 text-sm font-mono-brand tracking-wide transition-all hover:shadow-boxy-orange"
                >
                  Save
                </button>
              </div>

              {hasKey && (
                <button
                  onClick={handleRemove}
                  disabled={saving}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove API key
                </button>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => { if (confirm('Are you sure you want to sign out?')) logout() }}
            className="px-4 py-2 border border-gray-300 text-gray-600 hover:border-gray-400 text-sm font-mono-brand tracking-wide"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
