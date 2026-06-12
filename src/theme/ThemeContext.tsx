import { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
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

const STORAGE_KEY_DARK = 'theme-dark-v3'

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
    const apply = () => {
      setIsDark((prev) => {
        const next = !prev
        localStorage.setItem(STORAGE_KEY_DARK, String(next))
        return next
      })
    }

    // Cross-fade the whole edition swap; snap immediately for reduced motion
    // or browsers without the View Transitions API
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !document.startViewTransition) {
      apply()
      return
    }
    document.documentElement.setAttribute('data-theme-switching', '')
    const transition = document.startViewTransition(() => {
      flushSync(apply)
    })
    transition.finished.finally(() => {
      document.documentElement.removeAttribute('data-theme-switching')
    })
  }, [])

  const theme = useMemo(() => buildTheme(isDark), [isDark])
  const palette = useMemo(() => getPalette(isDark), [isDark])

  // Keep the browser chrome color in step with the edition
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.bg)
  }, [palette])

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

// eslint-disable-next-line react-refresh/only-export-components
export const useThemeToggle = () => useContext(ThemeContext)

// eslint-disable-next-line react-refresh/only-export-components
export const useColors = () => useContext(ThemeContext).palette
