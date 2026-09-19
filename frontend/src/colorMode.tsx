import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { createAppTheme, type Mode } from './theme'

const KEY = 'acme.mode'
const ColorModeContext = createContext<{ mode: Mode; toggle: () => void }>({ mode: 'light', toggle: () => {} })
export const useColorMode = () => useContext(ColorModeContext)

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
