import { Button, MenuItem, Stack, TextField } from '@mui/material'
import type { Meta } from '../api/types'

export interface Filters {
  search: string
  country: string
  department: string
  level: string
}

export const EMPTY_FILTERS: Filters = { search: '', country: '', department: '', level: '' }

interface Props {
  meta?: Meta
  value: Filters
  onChange: (next: Filters) => void
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <TextField select size="small" label={label} value={value} sx={{ minWidth: 160 }}
      onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">All</MenuItem>
      {options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
    </TextField>
  )
}

export default function EmployeeFilters({ meta, value, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch })
  const active = Object.values(value).some(Boolean)
  return (
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
      <TextField size="small" label="Search name, email or title" value={value.search} sx={{ minWidth: 280 }}
        onChange={(e) => set({ search: e.target.value })} />
      <Select label="Country" value={value.country} options={meta?.countries.map((c) => c.code) ?? []}
        onChange={(country) => set({ country })} />
      <Select label="Department" value={value.department} options={meta?.departments ?? []}
        onChange={(department) => set({ department })} />
      <Select label="Level" value={value.level} options={meta?.levels ?? []}
        onChange={(level) => set({ level })} />
      {active && <Button onClick={() => onChange(EMPTY_FILTERS)}>Clear</Button>}
    </Stack>
  )
}
