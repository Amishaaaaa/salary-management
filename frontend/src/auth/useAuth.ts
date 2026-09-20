import { createContext, useContext } from 'react'
import type { AuthUser } from '../api/client'

export interface AuthState {
  user: AuthUser | null
  /** true until we know whether a stored token is still valid (avoids a login-page flash on refresh) */
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
