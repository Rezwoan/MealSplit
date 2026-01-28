import { API_BASE_URL } from '../config'
import { getToken } from './auth'

export interface ApiError {
  status: number
  code?: string
  message: string
  details?: string
  missing?: string[]
  migrationHints?: string[]
}

export class ApiRequestError extends Error {
  status: number
  code?: string
  details?: string
  missing?: string[]
  migrationHints?: string[]

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.status = error.status
    this.code = error.code
    this.details = error.details
    this.missing = error.missing
    this.migrationHints = error.migrationHints
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })

    const text = await response.text()
    const data = text ? JSON.parse(text) : null

    if (!response.ok) {
      throw new ApiRequestError({
        status: response.status,
        code: data?.code,
        message: data?.message ?? `Request failed with status ${response.status}`,
        details: data?.details,
        missing: data?.missing,
        migrationHints: data?.migrationHints,
      })
    }

    return data as T
  } catch (err) {
    if (err instanceof ApiRequestError) {
      throw err
    }
    
    // Network or parsing error
    throw new ApiRequestError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Network request failed',
      details: 'Unable to connect to API server. Is it running?',
    })
  }
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
    receipt: {
      id: string
      purchaseId: string
      url: string
      originalFilename: string
      mimeType: string
      fileSizeBytes: number
      createdAt: string
    }
  }>(`/rooms/${roomId}/purchases/${purchaseId}/receipt`)
}

export async function deleteReceipt(roomId: string, purchaseId: string) {
  return apiRequest(`/rooms/${roomId}/purchases/${purchaseId}/receipt`, {
    method: 'DELETE',
  })
}
