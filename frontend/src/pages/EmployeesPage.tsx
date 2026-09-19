import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TableSortLabel, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/EditOutlined'
import HistoryIcon from '@mui/icons-material/History'
import { api } from '../api/client'
import type { Employee, EmployeeQuery } from '../api/types'
import EmployeeFormDialog from '../components/EmployeeFormDialog'
import SalaryHistoryDialog from '../components/SalaryHistoryDialog'
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
  { id: 'actions', label: '', sortable: false, align: 'right' as const },
]

export default function EmployeesPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState('last_name')
  const [page, setPage] = useState(0) // MUI is 0-based, the API is 1-based
  const [pageSize, setPageSize] = useState(25)

  const debouncedSearch = useDebounced(filters.search)
  const query: EmployeeQuery = { ...filters, search: debouncedSearch, ordering, page: page + 1, page_size: pageSize }

  const [editing, setEditing] = useState<Employee | null>(null)
  const [creating, setCreating] = useState(false)
  const [viewingHistory, setViewingHistory] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)

  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['insights'] })
      setDeleting(null)
    },
  })

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
        <Stack direction="row" spacing={1}>
          <Button startIcon={<DownloadIcon />} variant="outlined" href={api.exportUrl(query)}>
            Export CSV{data ? ` (${data.count.toLocaleString()})` : ''}
          </Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>Add employee</Button>
        </Stack>
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
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Salary history"><IconButton size="small" aria-label={`History for ${e.first_name} ${e.last_name}`} onClick={() => setViewingHistory(e)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${e.first_name} ${e.last_name}`} onClick={() => setEditing(e)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" aria-label={`Delete ${e.first_name} ${e.last_name}`} onClick={() => setDeleting(e)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
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

      <EmployeeFormDialog open={creating || !!editing} employee={editing} meta={meta.data}
        onClose={() => { setCreating(false); setEditing(null) }} />
      <SalaryHistoryDialog employee={viewingHistory} onClose={() => setViewingHistory(null)} />
      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete employee?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently removes {deleting?.first_name} {deleting?.last_name} and their salary history.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
