import { createContext, useContext, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user') || 'null')
  })

  const isAuthenticated = !!user

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/token/', {
      username: email,
      password,
    })
    const tokens = { access: res.data.access, refresh: res.data.refresh }
    localStorage.setItem('tokens', JSON.stringify(tokens))

    const userData = { email }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const signup = async (email, password) => {
    const res = await axios.post('/api/auth/signup/', { email, password })
    const tokens = res.data.tokens
    localStorage.setItem('tokens', JSON.stringify(tokens))

    const userData = res.data.user
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('tokens')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
