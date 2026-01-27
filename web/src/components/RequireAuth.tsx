import { Navigate } from 'react-router-dom'
import { getToken } from '../lib/auth'
import { ReactNode } from 'react'

interface RequireAuthProps {
  children: ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
