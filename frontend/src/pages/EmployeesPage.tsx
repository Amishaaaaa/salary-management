import { useState } from 'react'
import {
  Alert, Box, Button, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TableSortLabel, Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { api } from '../api/client'
import type { EmployeeQuery } from '../api/types'
import EmployeeFilters, { EMPTY_FILTERS, Filters } from '../components/EmployeeFilters'
import { formatMoney, formatUsd } from '../format'
import { useDebounced, useEmployees, useMeta } from '../hooks'

const COLUMNS = [
  { id: 'last_name', label: 'Name', sortable: true },
  { id: 'job_title', label: 'Job title', sortable: false },
  { id: 'department', label: 'Department', sortable: true },
  { id: 'level', label: 'Level', sortable: true },
  { id: 'country', label: 'Country', sortable: true },
  { id: 'salary', label: 'Salary (local)', sortable: false, align: 'right' as const },
  { id: 'salary_usd', label: 'Salary (USD)', sortable: true, align: 'right' as const },
]

export default function EmployeesPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState('last_name')
  const [page, setPage] = useState(0) // MUI is 0-based, the API is 1-based
  const [pageSize, setPageSize] = useState(25)

  const debouncedSearch = useDebounced(filters.search)
  const query: EmployeeQuery = { ...filters, search: debouncedSearch, ordering, page: page + 1, page_size: pageSize }

  const meta = useMeta()
  const { data, isLoading, isFetching, error } = useEmployees(query)

  const changeFilters = (next: Filters) => { setFilters(next); setPage(0) }
  const toggleSort = (id: string) => {
    setOrdering(ordering === id ? `-${id}` : id)
    setPage(0)
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Employees</Typography>
        <Button startIcon={<DownloadIcon />} variant="outlined" href={api.exportUrl(query)}>
          Export CSV{data ? ` (${data.count.toLocaleString()})` : ''}
        </Button>
      </Stack>

      <EmployeeFilters meta={meta.data} value={filters} onChange={changeFilters} />
      {error && <Alert severity="error">Could not load employees. Is the API running?</Alert>}

      <Paper variant="outlined">
        <Box sx={{ height: 4 }}>{(isLoading || isFetching) && <LinearProgress />}</Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableCell key={c.id} align={c.align}>
                    {c.sortable ? (
                      <TableSortLabel active={ordering.replace('-', '') === c.id}
                        direction={ordering === `-${c.id}` ? 'desc' : 'asc'} onClick={() => toggleSort(c.id)}>
                        {c.label}
                      </TableSortLabel>
                    ) : c.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.results.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{e.first_name} {e.last_name}<Typography variant="caption" display="block" color="text.secondary">{e.email}</Typography></TableCell>
                  <TableCell>{e.job_title}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>{e.level}</TableCell>
                  <TableCell>{e.country}</TableCell>
                  <TableCell align="right">{formatMoney(e.salary, e.currency)}</TableCell>
                  <TableCell align="right">{formatUsd(e.salary_usd)}</TableCell>
                </TableRow>
              ))}
              {data?.results.length === 0 && (
                <TableRow><TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6 }}>No employees match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={data?.count ?? 0} page={page} rowsPerPage={pageSize}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} />
      </Paper>
    </Stack>
  )
}
