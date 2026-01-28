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

// Receipt API functions
export async function uploadReceipt(roomId: string, purchaseId: string, file: File) {
  const token = getToken()
  if (!token) {
    throw new Error('Not authenticated')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(
    `${API_BASE_URL}/rooms/${roomId}/purchases/${purchaseId}/receipt`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to upload receipt')
  }

  return data
}

export async function getReceipt(roomId: string, purchaseId: string) {
  return apiRequest<{
    id: string
    purchaseId: string
    filePath: string
    originalFilename: string
    mimeType: string
    fileSizeBytes: number
    uploadedByUserId: string
    createdAt: string
    publicUrl: string
  }>(`/rooms/${roomId}/purchases/${purchaseId}/receipt`)
}

export async function deleteReceipt(roomId: string, purchaseId: string) {
  return apiRequest(`/rooms/${roomId}/purchases/${purchaseId}/receipt`, {
    method: 'DELETE',
  })
}
