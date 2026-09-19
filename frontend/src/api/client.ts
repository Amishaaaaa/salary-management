import type { Employee, EmployeeInput, EmployeeQuery, Meta, Page, SalaryRecord } from './types'

// Empty in dev (Vite proxies /api); set VITE_API_URL to the deployed backend origin in production.
const BASE = import.meta.env.VITE_API_URL ?? ''

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
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null))
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  meta: () => request<Meta>('/api/meta/'),
  listEmployees: (q: EmployeeQuery) => request<Page<Employee>>(`/api/employees/${toQueryString(q)}`),
  salaryHistory: (id: number) => request<SalaryRecord[]>(`/api/employees/${id}/salary-history/`),
  createEmployee: (data: EmployeeInput) =>
    request<Employee>('/api/employees/', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: Partial<EmployeeInput>) =>
    request<Employee>(`/api/employees/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmployee: (id: number) => request<void>(`/api/employees/${id}/`, { method: 'DELETE' }),
  insight: <T>(name: string, params: object) => request<T>(`/api/insights/${name}/${toQueryString(params)}`),
  exportUrl: (q: EmployeeQuery) => `${BASE}/api/employees/export/${toQueryString({ ...q, page: undefined, page_size: undefined })}`,
}

/** DRF returns {field: ["msg", ...]}; flatten to {field: "msg"} for form display. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || typeof err.body !== 'object' || err.body === null) return {}
  return Object.fromEntries(
    Object.entries(err.body as Record<string, unknown>).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : String(v)]),
  )
}
