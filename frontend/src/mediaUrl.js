/**
 * Resolve a media URL (e.g. /media/videos/foo.mp4) to an absolute URL
 * when the backend is on a different domain.
 */
const BACKEND_URL = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : ''

export function mediaUrl(path) {
  if (!path) return path
  if (path.startsWith('http')) return path
  return `${BACKEND_URL}${path}`
}
