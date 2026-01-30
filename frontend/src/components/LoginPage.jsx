import { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function LoginPage({ onSwitchToSignup }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      setError('Incorrect email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H8L12 22L16 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="#ea580c"/>
            </svg>
            <h1 className="text-lg font-bold text-gray-900 tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              KARYON
            </h1>
          </div>
          <p className="text-sm text-gray-500">Sign in to your account</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 shadow-boxy">
          {error && (
            <p className="text-xs text-red-600 mb-4">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 text-sm font-mono-brand tracking-wide transition-all hover:shadow-boxy-orange"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button
              onClick={() => alert('Please contact your administrator to reset your password.')}
              className="text-sm text-gray-400 hover:text-gray-600 block mx-auto"
            >
              Forgot your password?
            </button>
            <button
              onClick={onSwitchToSignup}
              className="text-sm text-orange-600 hover:text-orange-800 block mx-auto"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
