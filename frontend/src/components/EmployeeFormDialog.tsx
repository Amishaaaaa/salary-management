import { useEffect, useState } from 'react'
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, fieldErrors } from '../api/client'
import type { Employee, EmployeeInput, Meta } from '../api/types'

const BLANK: EmployeeInput = {
  first_name: '', last_name: '', email: '', job_title: '', department: '', level: '',
  gender: '', country: '', hire_date: '', salary: 0,
}
const GENDER_LABEL: Record<string, string> = { F: 'Female', M: 'Male', X: 'Non-binary / other' }

interface Props {
  open: boolean
  employee: Employee | null // null = create
  meta?: Meta
  onClose: () => void
}

export default function EmployeeFormDialog({ open, employee, meta, onClose }: Props) {
  const [form, setForm] = useState<EmployeeInput>(BLANK)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) return
    setForm(employee ? { ...employee } : BLANK)
    setReason('')
    setErrors({})
  }, [open, employee])

  const save = useMutation({
    mutationFn: () => {
      const { first_name, last_name, email, job_title, department, level, gender, country, hire_date } = form
      const body: EmployeeInput = { first_name, last_name, email, job_title, department, level, gender, country, hire_date, salary: Number(form.salary) }
      if (employee) return api.updateEmployee(employee.id, { ...body, change_reason: reason })
      return api.createEmployee(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['insights'] })
      queryClient.invalidateQueries({ queryKey: ['meta'] })
      onClose()
    },
    onError: (err) => setErrors(fieldErrors(err)),
  })

  const set = (k: keyof EmployeeInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })
  const field = (k: keyof EmployeeInput, label: string, extra = {}) => (
    <TextField label={label} value={form[k] ?? ''} onChange={set(k)} size="small" required fullWidth
      error={!!errors[k]} helperText={errors[k]} {...extra} />
  )
  const select = (k: keyof EmployeeInput, label: string, options: { value: string; label: string }[]) =>
    field(k, label, { select: true, children: options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>) })

  const currency = meta?.countries.find((c) => c.code === form.country)?.currency
  const salaryChanged = !!employee && (Number(form.salary) !== employee.salary || form.country !== employee.country)
  // Errors on fields we don't render (e.g. non_field_errors) still need to be shown somewhere.
  const unknownError = Object.keys(errors).length > 0 && !Object.keys(errors).some((k) => k in form)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{employee ? `Edit ${employee.first_name} ${employee.last_name}` : 'Add employee'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {unknownError && <Alert severity="error">{Object.values(errors).join(' ')}</Alert>}
          {save.isError && Object.keys(errors).length === 0 && <Alert severity="error">Could not save. Please try again.</Alert>}
          <Stack direction="row" spacing={2}>{field('first_name', 'First name')}{field('last_name', 'Last name')}</Stack>
          {field('email', 'Email', { type: 'email' })}
          {field('job_title', 'Job title', { select: true, children: meta?.job_titles.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>) })}
          <Stack direction="row" spacing={2}>
            {select('department', 'Department', (meta?.departments ?? []).map((d) => ({ value: d, label: d })))}
            {select('level', 'Level', (meta?.levels ?? []).map((l) => ({ value: l, label: l })))}
          </Stack>
          <Stack direction="row" spacing={2}>
            {select('gender', 'Gender', (meta?.genders ?? []).map((g) => ({ value: g, label: GENDER_LABEL[g] ?? g })))}
            {field('hire_date', 'Hire date', { type: 'date', InputLabelProps: { shrink: true } })}
          </Stack>
          <Stack direction="row" spacing={2}>
            {select('country', 'Country', (meta?.countries ?? []).map((c) => ({ value: c.code, label: `${c.code} (${c.currency})` })))}
            {field('salary', `Annual salary${currency ? ` (${currency})` : ''}`, { type: 'number', inputProps: { min: 1 } })}
          </Stack>
          {salaryChanged && (
            <TextField label="Reason for change (optional)" size="small" fullWidth value={reason}
              onChange={(e) => setReason(e.target.value)} helperText="Saved in this employee's salary history." />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
          {employee ? 'Save changes' : 'Add employee'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
