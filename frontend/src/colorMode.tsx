import { useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { createAppTheme, type Mode } from './theme'
import { ColorModeContext } from './useColorMode'

const KEY = 'acme.mode'

function initialMode(): Mode {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const theme = useMemo(() => createAppTheme(mode), [mode])
  const value = useMemo(() => ({
    mode,
    toggle: () => setMode((m) => {
      const next = m === 'light' ? 'dark' : 'light'
      try { localStorage.setItem(KEY, next) } catch { /* non-critical */ }
      return next
    }),
  }), [mode])
  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
    </ColorModeContext.Provider>
  )
}
