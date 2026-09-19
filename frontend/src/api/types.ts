export interface Employee {
  id: number
  first_name: string
  last_name: string
  email: string
  job_title: string
  department: string
  level: string
  gender: string
  country: string
  hire_date: string
  salary: number
  currency: string
  salary_usd: number
}

export type EmployeeInput = Omit<Employee, 'id' | 'currency' | 'salary_usd'> & {
  change_reason?: string
  effective_date?: string
}

export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Meta {
  countries: { code: string; currency: string }[]
  departments: string[]
  levels: string[]
  genders: string[]
  job_titles: string[]
}

export interface SalaryRecord {
  id: number
  amount: number
  currency: string
  effective_date: string
  reason: string
}

export interface EmployeeQuery {
  search?: string
  country?: string
  department?: string
  level?: string
  ordering?: string
  page?: number
  page_size?: number
}
