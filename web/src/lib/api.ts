import { API_BASE_URL } from '../config'
import { getToken } from './auth'

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const token = getToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data?.message ?? 'Request failed'
    throw new Error(message)
  }

  return data as T
}
