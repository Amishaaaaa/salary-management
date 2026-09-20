export interface Filters {
  search: string
  country: string
  department: string
  level: string
}

export const EMPTY_FILTERS: Filters = { search: '', country: '', department: '', level: '' }
