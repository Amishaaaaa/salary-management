import { alpha, createTheme, darken, lighten } from '@mui/material/styles'

export type Mode = 'light' | 'dark'

export const GRADIENTS = {
  brand: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
  sidebar: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%)',
  indigo: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  pink: 'linear-gradient(135deg, #ec4899, #f97316)',
  teal: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
  amber: 'linear-gradient(135deg, #f59e0b, #ef4444)',
}

export const DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: '#6366f1', Sales: '#10b981', Marketing: '#ec4899', Finance: '#f59e0b',
  HR: '#8b5cf6', Operations: '#0ea5e9', Support: '#14b8a6', Legal: '#64748b',
}

/** Chip colours that stay readable in both modes: tinted background, shade-adjusted text. */
export function tint(base: string, mode: Mode) {
  return { bg: alpha(base, mode === 'dark' ? 0.2 : 0.12), fg: mode === 'dark' ? lighten(base, 0.45) : darken(base, 0.3) }
}

export function createAppTheme(mode: Mode) {
  const dark = mode === 'dark'
  return createTheme({
    palette: {
      mode,
      primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
      secondary: { main: '#ec4899' },
      success: { main: '#10b981' },
      background: { default: dark ? '#0b0f1e' : '#f4f5fb', paper: dark ? '#131a2e' : '#ffffff' },
      text: { primary: dark ? '#f1f5f9' : '#0f172a', secondary: dark ? '#94a3b8' : '#64748b' },
      divider: dark ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.08)',
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: dark ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.07)', boxShadow: dark ? 'none' : '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 16 },
          containedPrimary: { background: GRADIENTS.indigo, '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: dark ? '#94a3b8' : '#64748b', backgroundColor: dark ? '#131a2e' : '#f8f9fd' },
        },
      },
      MuiTextField: { defaultProps: { variant: 'outlined' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: dark ? 'rgba(255,255,255,0.03)' : '#fff' } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
      MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    },
  })
}
