import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Employee } from '../api/types'
import { formatMoney } from '../format'

export default function SalaryHistoryDialog({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['history', employee?.id, employee?.salary],
    queryFn: () => api.salaryHistory(employee!.id),
    enabled: !!employee,
  })
  return (
    <Dialog open={!!employee} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Salary history: {employee?.first_name} {employee?.last_name}</DialogTitle>
      <DialogContent>
        {isLoading && <LinearProgress />}
        {data && data.length === 0 && <Typography color="text.secondary">No history recorded.</Typography>}
        {data && data.length > 0 && (
          <Table size="small">
            <TableHead><TableRow><TableCell>Effective</TableCell><TableCell align="right">Salary</TableCell><TableCell>Reason</TableCell></TableRow></TableHead>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.effective_date}</TableCell>
                  <TableCell align="right">{formatMoney(r.amount, r.currency)}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  )
}
