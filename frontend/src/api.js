import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('tokens') || 'null')
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`
  }
  return config
})

// On 401, try refreshing the token once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const tokens = JSON.parse(localStorage.getItem('tokens') || 'null')
      if (tokens?.refresh) {
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/auth/token/refresh/`, {
            refresh: tokens.refresh,
          })

          const newTokens = {
            access: res.data.access,
            refresh: res.data.refresh || tokens.refresh,
          }
          localStorage.setItem('tokens', JSON.stringify(newTokens))

          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('tokens')
          localStorage.removeItem('user')
          window.location.href = '/'
          return Promise.reject(error)
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api
