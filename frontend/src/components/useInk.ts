import { useTheme } from '@mui/material'

/** Chart ink that follows the light/dark theme instead of hard-coded greys. */
export function useInk() {
  const t = useTheme()
  return {
    primary: t.palette.text.primary, secondary: t.palette.text.secondary, grid: t.palette.divider, cursor: t.palette.action.hover,
    tooltip: { background: t.palette.background.paper, color: t.palette.text.primary, border: `1px solid ${t.palette.divider}`, borderRadius: 10, boxShadow: '0 8px 24px -8px rgba(0,0,0,.35)' },
  }
}
