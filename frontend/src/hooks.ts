import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from './api/client'
import type { EmployeeQuery } from './api/types'

export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export const useMeta = () => useQuery({ queryKey: ['meta'], queryFn: api.meta, staleTime: 5 * 60_000 })

export const useEmployees = (query: EmployeeQuery) =>
  useQuery({
    queryKey: ['employees', query],
    queryFn: () => api.listEmployees(query),
    placeholderData: keepPreviousData, // keep old rows visible while the next page loads (no flicker)
  })
