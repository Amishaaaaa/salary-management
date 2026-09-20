import { useState } from 'react'
import {
  Avatar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/SpaceDashboardRounded'
import PeopleIcon from '@mui/icons-material/PeopleAltRounded'
import LogoutIcon from '@mui/icons-material/LogoutRounded'
import MenuIcon from '@mui/icons-material/Menu'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useColorMode } from '../colorMode'
import { GRADIENTS } from '../theme'
import AuroraBackground from './AuroraBackground'
import Logo from './Logo'

const WIDTH = 264
const NAV = [
  { to: '/insights', label: 'Overview', title: 'Pay overview', icon: <DashboardIcon /> },
  { to: '/employees', label: 'Employees', title: 'Employees', icon: <PeopleIcon /> },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { mode, toggle } = useColorMode()
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const title = NAV.find((n) => pathname.startsWith(n.to))?.title ?? ''

  const signOut = async () => { await logout(); navigate('/login', { replace: true }) }

  const sidebar = (
    <Box sx={{ width: WIDTH, height: '100%', background: GRADIENTS.sidebar, color: '#fff', display: 'flex', flexDirection: 'column', p: 2.5 }}>
      <Box sx={{ px: 0.5, py: 1, mb: 3 }}><Logo /></Box>
      <Typography variant="caption" sx={{ px: 1.5, mb: 1, color: 'rgba(255,255,255,.45)', letterSpacing: '.08em' }}>WORKSPACE</Typography>
      <List disablePadding sx={{ flex: 1 }}>
        {NAV.map((n) => (
          <ListItemButton key={n.to} component={NavLink} to={n.to} onClick={() => setOpen(false)}
            sx={{
              borderRadius: 2.5, mb: 0.5, color: 'rgba(255,255,255,.72)',
              '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
              '&.active': { color: '#fff', background: 'linear-gradient(135deg, rgba(99,102,241,.9), rgba(139,92,246,.9))', boxShadow: '0 8px 20px -8px rgba(99,102,241,.8)' },
            }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)' }}>
        <Avatar sx={{ background: GRADIENTS.pink, width: 38, height: 38, fontWeight: 700 }}>{user?.name.charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{user?.name}</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.55)' }}>@{user?.username}</Typography>
        </Box>
        <Tooltip title="Sign out"><IconButton aria-label="Sign out" onClick={signOut} sx={{ color: 'rgba(255,255,255,.8)' }}><LogoutIcon /></IconButton></Tooltip>
      </Stack>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative', isolation: 'isolate' }}>
      <AuroraBackground variant="app" mode={mode} />
      {desktop
        ? <Box component="nav" sx={{ width: WIDTH, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>{sidebar}</Box>
        : <Drawer open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { border: 0 } }}>{sidebar}</Drawer>}

      <Box component="main" sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: { xs: 2, md: 4 }, py: 2, position: 'relative' }}>
          {!desktop && <IconButton aria-label="Open menu" onClick={() => setOpen(true)}><MenuIcon /></IconButton>}
          {desktop ? <Box sx={{ flex: 1 }} /> : <Typography variant="h6" sx={{ flex: 1 }}>{title}</Typography>}
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton aria-label="Toggle colour mode" onClick={toggle}>{mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}</IconButton>
          </Tooltip>
        </Stack>
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 5 }} className="fade-up" key={pathname}><Outlet /></Box>
      </Box>
    </Box>
  )
}
