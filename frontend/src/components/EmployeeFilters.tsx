import { Button, InputAdornment, MenuItem, Stack, TextField } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type { Meta } from '../api/types'
import { flag } from '../ui'
import { EMPTY_FILTERS, type Filters } from './filters'

interface Props {
  meta?: Meta
  value: Filters
  onChange: (next: Filters) => void
  hideSearch?: boolean
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void
}) {
  return (
    <TextField select size="small" label={label} value={value} sx={{ minWidth: 170 }} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">All</MenuItem>
      {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  )
}

export default function EmployeeFilters({ meta, value, onChange, hideSearch }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch })
  const active = Object.values(value).some(Boolean)
  return (
    <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
      {!hideSearch && (
        <TextField size="small" label="Search name, email or title" value={value.search} sx={{ minWidth: 300, flex: 1 }}
          onChange={(e) => set({ search: e.target.value })}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      )}
      <Select label="Country" value={value.country} options={(meta?.countries ?? []).map((c) => ({ value: c.code, label: `${flag(c.code)}  ${c.code}` }))}
        onChange={(country) => set({ country })} />
      <Select label="Department" value={value.department} options={(meta?.departments ?? []).map((d) => ({ value: d, label: d }))}
        onChange={(department) => set({ department })} />
      <Select label="Level" value={value.level} options={(meta?.levels ?? []).map((l) => ({ value: l, label: l }))}
        onChange={(level) => set({ level })} />
      {active && <Button onClick={() => onChange(EMPTY_FILTERS)}>Clear filters</Button>}
    </Stack>
  )
}
