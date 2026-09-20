import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  Avatar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/SpaceDashboardRounded'
import PeopleIcon from '@mui/icons-material/PeopleAltRounded'
import LogoutIcon from '@mui/icons-material/LogoutRounded'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useColorMode } from '../colorMode'
import {
  DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH, RAIL_WIDTH, dragWidth, isCollapsed, loadWidth, nudgeWidth, saveWidth, settleWidth,
} from '../sidebar'
import { GRADIENTS } from '../theme'
import AuroraBackground from './AuroraBackground'
import Logo from './Logo'

const NAV = [
  { to: '/insights', label: 'Overview', title: 'Pay overview', icon: <DashboardIcon /> },
  { to: '/employees', label: 'Employees', title: 'Employees', icon: <PeopleIcon /> },
]

interface SidebarProps { collapsed: boolean; onNavigate: () => void; onSignOut: () => void }

function SidebarContent({ collapsed, onNavigate, onSignOut }: SidebarProps) {
  const { user } = useAuth()
  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', background: GRADIENTS.sidebar, color: '#fff', display: 'flex', flexDirection: 'column', p: collapsed ? 1.5 : 2.5, transition: 'padding .2s' }}>
      <Box sx={{ px: collapsed ? 0 : 0.5, py: 1, mb: 3, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}><Logo compact={collapsed} /></Box>
      {!collapsed && <Typography variant="caption" sx={{ px: 1.5, mb: 1, color: 'rgba(255,255,255,.45)', letterSpacing: '.08em' }}>WORKSPACE</Typography>}
      <List disablePadding sx={{ flex: 1 }}>
        {NAV.map((n) => (
          <Tooltip key={n.to} title={collapsed ? n.label : ''} placement="right">
            <ListItemButton component={NavLink} to={n.to} onClick={onNavigate} aria-label={n.label}
              sx={{
                borderRadius: 2.5, mb: 0.5, color: 'rgba(255,255,255,.72)', justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 0 : 2,
                '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
                '&.active': { color: '#fff', background: 'linear-gradient(135deg, rgba(99,102,241,.9), rgba(139,92,246,.9))', boxShadow: '0 8px 20px -8px rgba(99,102,241,.8)' },
              }}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 40 }}>{n.icon}</ListItemIcon>
              {!collapsed && <ListItemText primary={n.label} primaryTypographyProps={{ fontWeight: 600, noWrap: true }} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
      <Stack direction={collapsed ? 'column' : 'row'} spacing={collapsed ? 1 : 1.5} alignItems="center"
        sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)' }}>
        <Tooltip title={collapsed ? `${user?.name} (@${user?.username})` : ''} placement="right">
          <Avatar sx={{ background: GRADIENTS.pink, width: 38, height: 38, fontWeight: 700 }}>{user?.name.charAt(0).toUpperCase()}</Avatar>
        </Tooltip>
        {!collapsed && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{user?.name}</Typography>
            <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,.55)' }}>@{user?.username}</Typography>
          </Box>
        )}
        <Tooltip title="Sign out" placement={collapsed ? 'right' : 'top'}>
          <IconButton aria-label="Sign out" onClick={onSignOut} sx={{ color: 'rgba(255,255,255,.8)' }}><LogoutIcon /></IconButton>
        </Tooltip>
      </Stack>
    </Box>
  )
}

export default function Layout() {
  const { logout } = useAuth()
  const { mode, toggle } = useColorMode()
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(loadWidth)
  const [dragging, setDragging] = useState(false)
  const lastExpanded = useRef(isCollapsed(width) ? DEFAULT_WIDTH : width) // where "expand" returns to
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const title = NAV.find((n) => pathname.startsWith(n.to))?.title ?? ''
  const collapsed = isCollapsed(width)

  const commit = (next: number) => {
    setWidth(next)
    saveWidth(next)
    if (!isCollapsed(next)) lastExpanded.current = next
  }
  const toggleCollapsed = () => commit(collapsed ? lastExpanded.current : RAIL_WIDTH)
  const signOut = async () => { await logout(); navigate('/login', { replace: true }) }

  // Dragging the right edge resizes live; releasing settles into the rail or a valid full width.
  const startDrag = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const onDrag = (e: PointerEvent<HTMLDivElement>) => { if (dragging) setWidth(dragWidth(e.clientX)) }
  const endDrag = () => { if (dragging) { setDragging(false); commit(settleWidth(width)) } }
  const onHandleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, () => void> = {
      ArrowRight: () => commit(nudgeWidth(width, 16)),
      ArrowLeft: () => commit(nudgeWidth(width, -16)),
      Home: () => commit(RAIL_WIDTH),
      Enter: () => commit(DEFAULT_WIDTH),
    }
    if (step[e.key]) { e.preventDefault(); step[e.key]() }
  }

  // Keep the saved width valid if the window is reopened at a different size (never wider than 40% of the screen).
  useEffect(() => {
    if (desktop && width > window.innerWidth * 0.4 && !collapsed) commit(Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.4)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop])

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative', isolation: 'isolate' }}>
      <AuroraBackground variant="app" mode={mode} />
      {desktop ? (
        <Box component="nav" aria-label="Main" sx={{ width, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', zIndex: 3, transition: dragging ? 'none' : 'width .22s cubic-bezier(.2,.7,.2,1)' }}>
          <SidebarContent collapsed={collapsed} onNavigate={() => {}} onSignOut={signOut} />

          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton size="small" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={toggleCollapsed}
              sx={{ position: 'absolute', top: 30, right: -14, zIndex: 5, width: 28, height: 28, bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: 3, '&:hover': { bgcolor: 'background.paper', color: 'primary.main' } }}>
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Box role="separator" aria-orientation="vertical" aria-label="Resize sidebar" tabIndex={0}
            aria-valuenow={width} aria-valuemin={RAIL_WIDTH} aria-valuemax={MAX_WIDTH}
            onPointerDown={startDrag} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
            onDoubleClick={() => commit(DEFAULT_WIDTH)} onKeyDown={onHandleKey}
            sx={{
              position: 'absolute', top: 0, bottom: 0, right: -5, width: 10, cursor: 'col-resize', touchAction: 'none', zIndex: 4,
              '&::after': { content: '""', position: 'absolute', top: 0, bottom: 0, left: 4, width: 2, borderRadius: 1, bgcolor: 'primary.light', opacity: dragging ? 1 : 0, transition: 'opacity .15s' },
              '&:hover::after, &:focus-visible::after': { opacity: 0.9 },
              '&:focus-visible': { outline: 'none' },
            }} />
        </Box>
      ) : (
        <Drawer open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { border: 0, width: DEFAULT_WIDTH } }}>
          <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} onSignOut={signOut} />
        </Drawer>
      )}

      <Box component="main" sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1, userSelect: dragging ? 'none' : 'auto' }}>
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
