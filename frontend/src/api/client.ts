import type { Employee, EmployeeInput, EmployeeQuery, Meta, Page, SalaryRecord } from './types'

// Empty in dev (Vite proxies /api); set VITE_API_URL to the deployed backend origin in production.
const BASE = import.meta.env.VITE_API_URL ?? ''

const TOKEN_KEY = 'acme.token'

/** localStorage can throw (private mode, blocked storage); fall back to memory so login still works. */
let memoryToken: string | null = null
export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY) ?? memoryToken } catch { return memoryToken }
  },
  set(token: string) {
    memoryToken = token
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* memory fallback */ }
  },
  clear() {
    memoryToken = null
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* nothing to clear */ }
  },
}

let onUnauthorized: () => void = () => {}
/** The auth provider registers this so an expired/revoked token sends the user back to login. */
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API error ${status}`)
  }
}

export function toQueryString(params: object): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null) qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Token ${token}` } : {}) },
  })
  if (res.status === 401 && token) {
    tokenStore.clear()
    onUnauthorized()
  }
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null))
  return res.status === 204 ? (undefined as T) : res.json()
}

export interface AuthUser { username: string; name: string }

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<void>('/api/auth/logout/', { method: 'POST' }),
  me: () => request<AuthUser>('/api/auth/me/'),
  meta: () => request<Meta>('/api/meta/'),
  listEmployees: (q: EmployeeQuery) => request<Page<Employee>>(`/api/employees/${toQueryString(q)}`),
  salaryHistory: (id: number) => request<SalaryRecord[]>(`/api/employees/${id}/salary-history/`),
  createEmployee: (data: EmployeeInput) =>
    request<Employee>('/api/employees/', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: Partial<EmployeeInput>) =>
    request<Employee>(`/api/employees/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmployee: (id: number) => request<void>(`/api/employees/${id}/`, { method: 'DELETE' }),
  insight: <T>(name: string, params: object) => request<T>(`/api/insights/${name}/${toQueryString(params)}`),
  /** CSV needs the auth header, so fetch it and hand the browser a Blob instead of using a plain link. */
  async downloadExport(q: EmployeeQuery, filename = 'employees.csv') {
    const token = tokenStore.get()
    const res = await fetch(`${BASE}/api/employees/export/${toQueryString({ ...q, page: undefined, page_size: undefined })}`, {
      headers: token ? { Authorization: `Token ${token}` } : {},
    })
    if (!res.ok) throw new ApiError(res.status, null)
    const url = URL.createObjectURL(await res.blob())
    const a = Object.assign(document.createElement('a'), { href: url, download: filename })
    a.click()
    URL.revokeObjectURL(url)
  },
}

/** DRF returns {field: ["msg", ...]}; flatten to {field: "msg"} for form display. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || typeof err.body !== 'object' || err.body === null) return {}
  return Object.fromEntries(
    Object.entries(err.body as Record<string, unknown>).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : String(v)]),
  )
}
