import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { buildTheme } from '@/theme'
import { getPalette, type ThemePalette } from './palettes'

type ThemeContextValue = {
  isDark: boolean
  palette: ThemePalette
  toggleColorMode: () => void
}

const ThemeContext = createContext<ThemeContextValue>(null!)

const STORAGE_KEY_DARK = 'theme-dark'

const readBool = (key: string, fallback: boolean): boolean => {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    return v === 'true'
  } catch {
    return fallback
  }
}

export const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(() => readBool(STORAGE_KEY_DARK, true))

  const toggleColorMode = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY_DARK, String(next))
      return next
    })
  }, [])

  const theme = useMemo(() => buildTheme(isDark), [isDark])
  const palette = useMemo(() => getPalette(isDark), [isDark])

  const ctx = useMemo<ThemeContextValue>(
    () => ({ isDark, palette, toggleColorMode }),
    [isDark, palette, toggleColorMode],
  )

  return (
    <ThemeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}

export const useThemeToggle = () => useContext(ThemeContext)

export const useColors = () => useContext(ThemeContext).palette
