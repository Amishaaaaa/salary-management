import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, setUnauthorizedHandler, tokenStore, type AuthUser } from '../api/client'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(() => !!tokenStore.get())
  const queryClient = useQueryClient()

  const reset = useCallback(() => {
    setUser(null)
    queryClient.clear() // never leave one user's salary data cached for the next
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(reset)
    if (!tokenStore.get()) return
    // A 401 is handled by the API client (it clears the token and resets us). Any other failure, such as a
    // brief network error, must not silently sign the user out.
    api.me().then(setUser).catch(() => undefined).finally(() => setLoading(false))
  }, [reset])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    tokenStore.set(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    try { await api.logout() } catch { /* token may already be invalid; we still sign out locally */ }
    tokenStore.clear()
    reset()
  }, [reset])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

