import { createTheme } from '@mui/material/styles'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import { getPalette } from './palettes'

const SPACE_GROTESK = '"Space Grotesk", system-ui, sans-serif'
const DM_SANS = '"DM Sans", system-ui, sans-serif'
const SPACE_MONO = '"Space Mono", ui-monospace, monospace'

export const buildTheme = (isDark: boolean) => {
  const c = getPalette(isDark)

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      background: {
        default: c.bg,
        paper: c.surface,
      },
      primary: {
        main: c.coral,
        contrastText: isDark ? c.bg : '#FFFFFF',
      },
      secondary: {
        main: c.teal,
        contrastText: isDark ? c.bg : '#FFFFFF',
      },
      warning: {
        main: c.warmCoral,
      },
      text: {
        primary: c.cream,
        secondary: c.beige,
      },
      divider: c.rose,
    },
    typography: {
      fontFamily: DM_SANS,
      h1: { fontFamily: SPACE_GROTESK, fontWeight: 700, letterSpacing: '-0.03em' },
      h2: { fontFamily: SPACE_GROTESK, fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontFamily: SPACE_GROTESK, fontWeight: 500, letterSpacing: '-0.015em' },
      h4: { fontFamily: SPACE_GROTESK, fontWeight: 500 },
      h5: { fontFamily: SPACE_GROTESK, fontWeight: 500 },
      h6: { fontFamily: SPACE_GROTESK, fontWeight: 500 },
      overline: {
        fontFamily: SPACE_MONO,
        letterSpacing: '0.12em',
        fontSize: '0.7rem',
      },
      caption: { fontFamily: SPACE_MONO, fontSize: '0.75rem' },
    },
    shape: {
      borderRadius: 2,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: DM_SANS,
          },
          '::selection': {
            background: `${c.coral}33`,
            color: c.coral,
          },
          '::-webkit-scrollbar': { width: '6px' },
          '::-webkit-scrollbar-track': { background: c.bg },
          '::-webkit-scrollbar-thumb': {
            background: c.rose,
            borderRadius: '3px',
          },
          '::-webkit-scrollbar-thumb:hover': { background: `${c.coral}55` },
          '.skip-link': {
            position: 'absolute',
            left: 12,
            top: -48,
            padding: '8px 14px',
            fontFamily: SPACE_MONO,
            fontSize: '0.8rem',
            backgroundColor: c.bg,
            color: c.coral,
            border: `2px solid ${c.coral}`,
            zIndex: 9999,
            transition: 'top 0.15s ease',
            '&:focus': { top: 12, outline: 'none' },
          },
          ':focus-visible': {
            outline: `2px solid ${c.coral}`,
            outlineOffset: '2px',
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.001ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.001ms !important',
              scrollBehavior: 'auto !important',
            },
          },
          '@media (forced-colors: active)': {
            '*': {
              borderColor: 'CanvasText !important',
            },
            'a, button, [role="button"], [role="slider"]': {
              forcedColorAdjust: 'none',
            },
          },
          '@media (prefers-contrast: more)': {
            body: { color: 'CanvasText' },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            fontFamily: SPACE_MONO,
            letterSpacing: '0.05em',
            textTransform: 'none' as const,
            borderRadius: 2,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${c.rose}`,
            backgroundImage: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              borderColor: c.coral,
              boxShadow: `0 0 20px ${c.coral}15`,
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: c.rose },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontFamily: SPACE_MONO,
            fontSize: '0.7rem',
            height: 24,
            borderRadius: 2,
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: c.teal,
            textDecorationColor: 'transparent',
            transition: 'text-decoration-color 0.15s',
            '&:hover': { textDecorationColor: c.teal },
          },
        },
      },
    },
  })
}

const theme = buildTheme(true)

export { SPACE_MONO, SPACE_GROTESK, theme }
