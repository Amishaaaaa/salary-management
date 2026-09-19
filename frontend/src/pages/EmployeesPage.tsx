import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton,
  LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TableSortLabel, Tooltip, Typography, useTheme,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import HistoryIcon from '@mui/icons-material/History'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import { api } from '../api/client'
import type { Employee, EmployeeQuery } from '../api/types'
import EmployeeFilters, { EMPTY_FILTERS, Filters } from '../components/EmployeeFilters'
import EmployeeFormDialog from '../components/EmployeeFormDialog'
import SalaryHistoryDialog from '../components/SalaryHistoryDialog'
import { formatMoney, formatUsd } from '../format'
import { useDebounced, useEmployees, useMeta } from '../hooks'
import { DEPARTMENT_COLORS, GRADIENTS, tint } from '../theme'
import { avatarGradient, flag, initials } from '../ui'

const COLUMNS = [
  { id: 'last_name', label: 'Employee', sortable: true },
  { id: 'department', label: 'Department', sortable: true },
  { id: 'level', label: 'Level', sortable: true },
  { id: 'country', label: 'Country', sortable: true },
  { id: 'salary', label: 'Salary (local)', sortable: false, align: 'right' as const },
  { id: 'salary_usd', label: 'Salary (USD)', sortable: true, align: 'right' as const },
  { id: 'actions', label: '', sortable: false, align: 'right' as const },
]

export default function EmployeesPage() {
  const theme = useTheme()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState('last_name')
  const [page, setPage] = useState(0) // MUI is 0-based, the API is 1-based
  const [pageSize, setPageSize] = useState(25)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [creating, setCreating] = useState(false)
  const [viewingHistory, setViewingHistory] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const [exportError, setExportError] = useState(false)

  const debouncedSearch = useDebounced(filters.search)
  const query: EmployeeQuery = { ...filters, search: debouncedSearch, ordering, page: page + 1, page_size: pageSize }

  const queryClient = useQueryClient()
  const meta = useMeta()
  const { data, isLoading, isFetching, error } = useEmployees(query)

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['insights'] })
      setDeleting(null)
    },
  })

  const changeFilters = (next: Filters) => { setFilters(next); setPage(0) }
  const toggleSort = (id: string) => { setOrdering(ordering === id ? `-${id}` : id); setPage(0) }
  const exportCsv = () => api.downloadExport(query).then(() => setExportError(false)).catch(() => setExportError(true))

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4">Employees</Typography>
          <Typography color="text.secondary">
            {data ? `${data.count.toLocaleString()} people match your filters` : 'Loading people…'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<DownloadIcon />} variant="outlined" color="inherit" onClick={exportCsv} disabled={!data?.count}>Export CSV</Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>Add employee</Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <EmployeeFilters meta={meta.data} value={filters} onChange={changeFilters} />
      </Paper>
      {error && <Alert severity="error">Could not load employees. Please try again.</Alert>}
      {exportError && <Alert severity="error" onClose={() => setExportError(false)}>Export failed. Please try again.</Alert>}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: 3 }}>{(isLoading || isFetching) && <LinearProgress />}</Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableCell key={c.id} align={c.align}>
                    {c.sortable ? (
                      <TableSortLabel active={ordering.replace('-', '') === c.id} direction={ordering === `-${c.id}` ? 'desc' : 'asc'} onClick={() => toggleSort(c.id)}>
                        {c.label}
                      </TableSortLabel>
                    ) : c.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.results.map((e) => {
                const dept = tint(DEPARTMENT_COLORS[e.department] ?? '#64748b', theme.palette.mode)
                return (
                  <TableRow key={e.id} hover sx={{ '&:last-child td': { border: 0 }, '& .row-actions': { opacity: { xs: 1, md: 0.35 }, transition: 'opacity .15s' }, '&:hover .row-actions': { opacity: 1 } }}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ background: avatarGradient(`${e.first_name} ${e.last_name}`), width: 38, height: 38, fontSize: 14, fontWeight: 700 }}>
                          {initials(e.first_name, e.last_name)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600} lineHeight={1.25}>{e.first_name} {e.last_name}</Typography>
                          <Typography variant="body2" color="text.secondary">{e.job_title}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip size="small" label={e.department} sx={{ bgcolor: dept.bg, color: dept.fg, fontWeight: 600 }} /></TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={e.level} sx={{ fontWeight: 600 }} /></TableCell>
                    <TableCell><Box component="span" sx={{ fontSize: 18, mr: 0.75, verticalAlign: 'middle' }} aria-hidden>{flag(e.country)}</Box>{e.country}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(e.salary, e.currency)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatUsd(e.salary_usd)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} className="row-actions">
                      <Tooltip title="Salary history"><IconButton size="small" aria-label={`History for ${e.first_name} ${e.last_name}`} onClick={() => setViewingHistory(e)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${e.first_name} ${e.last_name}`} onClick={() => setEditing(e)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" aria-label={`Delete ${e.first_name} ${e.last_name}`} onClick={() => setDeleting(e)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
              {data?.results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 8 }}>
                    <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, borderRadius: '50%', display: 'grid', placeItems: 'center', background: GRADIENTS.indigo, color: '#fff' }}><SearchOffIcon /></Box>
                    <Typography fontWeight={600}>No employees match these filters.</Typography>
                    <Typography variant="body2" color="text.secondary">Try a different search or clear the filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={data?.count ?? 0} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} />
      </Paper>

      <EmployeeFormDialog open={creating || !!editing} employee={editing} meta={meta.data} onClose={() => { setCreating(false); setEditing(null) }} />
      <SalaryHistoryDialog employee={viewingHistory} onClose={() => setViewingHistory(null)} />
      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete employee?</DialogTitle>
        <DialogContent>
          <DialogContentText>This permanently removes {deleting?.first_name} {deleting?.last_name} and their salary history.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
