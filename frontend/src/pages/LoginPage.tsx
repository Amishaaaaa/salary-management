import { useState, type FormEvent } from 'react'
import {
  Alert, Box, Button, IconButton, InputAdornment, Paper, Stack, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import PublicIcon from '@mui/icons-material/Public'
import InsightsIcon from '@mui/icons-material/AutoGraph'
import ShieldIcon from '@mui/icons-material/VerifiedUser'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import AuroraBackground from '../components/AuroraBackground'
import Logo from '../components/Logo'

// Shown so reviewers can sign in. Set VITE_SHOW_DEMO_LOGIN=false for a real deployment.
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_LOGIN !== 'false'
const DEMO = { username: 'hr', password: 'acme-hr-2026' }

const FEATURES = [
  { icon: <PublicIcon />, title: '10,000 people, 10 countries', text: 'One place instead of scattered spreadsheets.' },
  { icon: <InsightsIcon />, title: 'Answers, not just rows', text: 'Payroll, pay ranges, outliers and pay gaps in a click.' },
  { icon: <ShieldIcon />, title: 'Every change is recorded', text: 'Salary history is kept, never overwritten.' },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const wide = useMediaQuery(useTheme().breakpoints.up('md'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/insights'
  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429
        ? 'Too many attempts. Please wait a minute and try again.'
        : err instanceof ApiError && err.status === 400
          ? 'Invalid username or password.'
          : 'Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', isolation: 'isolate', display: 'grid', gridTemplateColumns: wide ? '1.1fr 1fr' : '1fr' }}>
      <AuroraBackground variant="login" />
      {wide && (
        <Box sx={{ position: 'relative', zIndex: 1, color: '#fff', p: 7, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ position: 'relative' }}><Logo /></Box>
          <Box sx={{ position: 'relative' }}>
            <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-0.03em', lineHeight: 1.1, mb: 2 }}>
              Pay people fairly.<br />
              <Box component="span" sx={{ background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)', WebkitBackgroundClip: 'text', color: 'transparent' }}>See it clearly.</Box>
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.72)', maxWidth: 460, mb: 4 }}>
              The salary workspace for HR: manage compensation across every country and understand how your organisation really pays.
            </Typography>
            <Stack spacing={2}>
              {FEATURES.map((f) => (
                <Stack key={f.title} direction="row" spacing={2} alignItems="center"
                  sx={{ p: 1.75, borderRadius: 3, bgcolor: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', backdropFilter: 'blur(8px)', maxWidth: 480 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.14)' }}>{f.icon}</Box>
                  <Box><Typography fontWeight={600}>{f.title}</Typography><Typography variant="body2" sx={{ color: 'rgba(255,255,255,.65)' }}>{f.text}</Typography></Box>
                </Stack>
              ))}
            </Stack>
          </Box>
          <Typography variant="caption" sx={{ position: 'relative', color: 'rgba(255,255,255,.5)' }}>© ACME · Confidential compensation data</Typography>
        </Box>
      )}

      <Box sx={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
        <Paper variant="outlined" component="form" onSubmit={submit} className="fade-up" sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4.5 }, borderRadius: 5, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(19,26,46,.82)' : 'rgba(255,255,255,.9)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.25)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.55)' }}>
          {!wide && <Box sx={{ mb: 3, p: 1.5, borderRadius: 3, bgcolor: '#1e1b4b', display: 'inline-block' }}><Logo /></Box>}
          <Typography variant="h5" sx={{ mb: 0.5 }}>Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Sign in to manage salaries and view pay insights.</Typography>

          <Stack spacing={2}>
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            <TextField label="Username" value={username} autoFocus autoComplete="username" required fullWidth
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineIcon fontSize="small" /></InputAdornment> }} />
            <TextField label="Password" value={password} type={show ? 'text' : 'password'} autoComplete="current-password" required fullWidth
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} edge="end">
                      {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }} />
            <Button type="submit" variant="contained" size="large" disabled={busy || !username || !password} sx={{ py: 1.4 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>

          {SHOW_DEMO && (
            <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>DEMO ACCOUNT</Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body2">
                  <b>{DEMO.username}</b> / <b>{DEMO.password}</b>
                </Typography>
                <Button size="small" onClick={() => { setUsername(DEMO.username); setPassword(DEMO.password) }}>Fill in</Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  )
}
