import { createContext, useContext } from 'react'
import type { Mode } from './theme'

export const ColorModeContext = createContext<{ mode: Mode; toggle: () => void }>({ mode: 'light', toggle: () => {} })
export const useColorMode = () => useContext(ColorModeContext)
