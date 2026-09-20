import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenStore } from '../api/client'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

function Probe() {
  const { user, loading, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="state">{loading ? 'loading' : user ? `in:${user.username}` : 'out'}</span>
      <button onClick={() => login('hr', 'pw')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider><Probe /></AuthProvider>
    </QueryClientProvider>,
  )

const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }))

describe('AuthProvider', () => {
  beforeEach(() => { localStorage.clear(); tokenStore.clear() })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('restores the session from a stored token', async () => {
    tokenStore.set('abc')
    vi.stubGlobal('fetch', vi.fn(() => json(200, { username: 'hr', name: 'HR Manager' })))
    mount()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('in:hr'))
  })

  it('keeps the stored token when the server is briefly unreachable (a network blip is not a logout)', async () => {
    tokenStore.set('abc')
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('network down'))))
    mount()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('out'))
    expect(tokenStore.get()).toBe('abc')
  })

  it('drops the token when the server rejects it (expired or revoked)', async () => {
    tokenStore.set('stale')
    vi.stubGlobal('fetch', vi.fn(() => json(401, { detail: 'Invalid token.' })))
    mount()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('out'))
    expect(tokenStore.get()).toBeNull()
  })

  it('logs in, stores the token, and clears it again on logout', async () => {
    const fetchMock = vi.fn((url: string) =>
      url.includes('/login/') ? json(200, { token: 'tok', user: { username: 'hr', name: 'HR' } }) : Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)
    mount()
    await act(async () => { screen.getByText('login').click() })
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('in:hr'))
    expect(tokenStore.get()).toBe('tok')

    await act(async () => { screen.getByText('logout').click() })
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('out'))
    expect(tokenStore.get()).toBeNull()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/logout/'))).toBe(true) // server-side revoke was requested
  })
})
