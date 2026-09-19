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

export interface Summary { headcount: number; total_payroll_usd: number; mean_usd: number; median_usd: number }
export interface PayrollGroup { group: string; headcount: number; total_usd: number; avg_usd: number }
export interface PercentileGroup { group: string; count: number; min: number; p25: number; median: number; p75: number; max: number; mean: number }
export interface GenderGapGroup { group: string; female_count: number; male_count: number; female_index: number; male_index: number; gap_pct: number }
export interface Outlier {
  id: number; first_name: string; last_name: string; job_title: string; level: string; country: string
  salary: number; currency: string; salary_usd: number; peer_median_usd: number; deviation_pct: number; peer_count: number
}
export type InsightFilters = { country?: string; department?: string; level?: string }
