import { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Container, Typography, IconButton, Tooltip } from '@mui/material'
import { LightMode, DarkMode } from '@mui/icons-material'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { SPACE_MONO } from '@/theme'
import { useThemeToggle, useColors } from '@/theme/ThemeContext'
import { CliSearch, SearchBackdrop } from '@/components/CliSearch'
import { GlitchText } from '../ui/GlitchText'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n'

const PAGE_LINKS = [
  { to: '/work', label: 'work' },
  { to: '/about', label: 'about' },
] as const

const SWIPE_ORDER = ['/', '/work', '/about', '/notes'] as const

// Horizontal flick on touch devices moves between pages. Guards: single
// finger, away from screen edges (browser back/forward gestures), not on
// draggable widgets, mostly horizontal, and quick.
function useSwipeNavigation(enabled: boolean) {
  const navigate = useNavigate()
  const location = useLocation()
  const pathRef = useRef(location.pathname)

  useEffect(() => {
    pathRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    if (!enabled) return
    let start: { x: number; y: number; t: number } | null = null

    const onTouchStart = (e: TouchEvent) => {
      start = null
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      const EDGE = 24
      if (touch.clientX < EDGE || touch.clientX > window.innerWidth - EDGE) return
      const target = e.target as Element | null
      if (target?.closest('[data-swipe-ignore], [role="slider"], input, textarea')) return
      start = { x: touch.clientX, y: touch.clientY, t: performance.now() }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!start) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const elapsed = performance.now() - start.t
      start = null
      if (elapsed > 600 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return
      const idx = SWIPE_ORDER.indexOf(pathRef.current as (typeof SWIPE_ORDER)[number])
      if (idx === -1) return
      const next = SWIPE_ORDER[idx + (dx < 0 ? 1 : -1)]
      if (next) navigate({ to: next })
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled, navigate])
}

const MOTIF_BASE_MS = 3500
const MOTIF_PER_CHAR_MS = 70

const MOTIF_KEYS = [
  'layout.motifCake',
  'layout.motifHello',
  'layout.motifPokemon',
  'layout.motifMinecraft',
  'layout.motifValorant',
  'layout.motifLol',
] as const

function motifDuration(text: string) {
  return MOTIF_BASE_MS + text.length * MOTIF_PER_CHAR_MS
}

function useRotatingMotif() {
  const { t } = useTranslation()
  const [index, setIndex] = useState(() => Math.floor(Math.random() * MOTIF_KEYS.length))
  const text = t(MOTIF_KEYS[index])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % MOTIF_KEYS.length)
    }, motifDuration(text))
    return () => window.clearTimeout(id)
  }, [text])

  return text
}

const Motif = () => {
  const motif = useRotatingMotif()
  const c = useColors()

  return (
    <GlitchText transitionDelay={motifDuration(motif)} intensity={0.25} scanlineBoost={3}>
      <Typography
        component="span"
        aria-hidden="true"
        sx={{
          fontFamily: SPACE_MONO,
          fontSize: { xs: '0.65rem', sm: '0.8rem' },
          color: c.beige,
          opacity: 0.55,
          ml: { xs: 0, sm: 1.5 },
          mt: { xs: 0.25, sm: 0 },
          whiteSpace: { xs: 'nowrap', sm: 'nowrap' },
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: { xs: '55vw', sm: 'none' },
          lineHeight: 1.3,
          transition: 'opacity 0.6s ease',
          display: { xs: 'block', sm: 'inline' },
        }}
      >
        {motif}
      </Typography>
    </GlitchText>
  )
}

function NavBrand({ onClick }: { onClick: () => void }) {
  const c = useColors()

  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'baseline' },
        textAlign: 'left',
        '&:focus-visible': {
          outline: `2px solid ${c.coral}`,
          outlineOffset: 4,
          borderRadius: 1,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
      <Typography
        component="span"
        sx={{
          fontFamily: SPACE_MONO,
          fontSize: '1rem',
          fontWeight: 700,
          color: 'text.primary',
        }}
      >
        cd
      </Typography>
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          width: '0.6em',
          height: '1.25em',
          ml: 0.25,
          position: 'relative',
          top: '0.25em',
          backgroundColor: c.coral,
          animation: 'blink 1.2s steps(1) infinite',
          '@keyframes blink': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0 },
          },
        }}
      />
      <Box
        component="kbd"
        sx={{
          fontFamily: SPACE_MONO,
          fontSize: '0.55rem',
          color: c.beige,
          opacity: 0.5,
          backgroundColor: `${c.rose}22`,
          border: `1px solid ${c.rose}33`,
          borderRadius: '3px',
          px: 0.75,
          py: 0.25,
          display: { xs: 'none', sm: 'inline-block' },
          cursor: 'pointer',
          transition: 'opacity 0.15s',
          '&:hover': { opacity: 0.6 },
        }}
      >
        ⌘K
      </Box>
      </Box>
      <Motif />
    </Box>
  )
}

function useFps() {
  const [fps, setFps] = useState(60)
  useEffect(() => {
    let raf = 0
    let frames = 0
    let last = performance.now()
    const loop = (now: number) => {
      frames++
      if (now - last >= 1000) {
        setFps(frames)
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

function useMousePos() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])
  return pos
}

function DebugOverlay() {
  const fps = useFps()
  const { x, y } = useMousePos()
  const location = useLocation()
  const { isDark } = useThemeToggle()
  const { i18n } = useTranslation()
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const handler = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const facing = x < viewport.w / 2 ? 'west' : 'east'
  const axis = x < viewport.w / 2 ? '-x' : '+x'
  const route = location.pathname === '/' ? 'home' : location.pathname.replace('/', '')
  const perf = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  const mem = perf ? `${Math.round(perf.usedJSHeapSize / 1048576)}/${Math.round(perf.jsHeapSizeLimit / 1048576)}MB` : 'n/a'

  const lines = {
    left: [
      'Portfolio 24w14a (cuongduong-v2)',
      `${fps} fps`,
      `Rendering: ${route} section`,
      '',
      `XYZ: ${x.toFixed(3)} / ${y.toFixed(3)} / ${Math.round(window.scrollY)}`,
      `Block: ${route}`,
      `Facing: ${facing} (Towards positive ${axis.toUpperCase()})`,
      '',
      `Biome: cyber_zen/${isDark ? 'dark_forest' : 'cream_plains'}`,
      `Local Difficulty: ${i18n.resolvedLanguage}`,
      'Day 1, 06:00',
    ],
    right: [
      `JavaScript: ${navigator.userAgent.split(' ').slice(-2, -1)[0] ?? 'Unknown'}`,
      `Mem: ${mem}`,
      `CPU: <${navigator.hardwareConcurrency ?? '?'} cores>`,
      '',
      `Display: ${viewport.w}x${viewport.h}`,
      `GPU: <WebGL>`,
      '',
      `Targeted Block: ${Math.round(x)}, ${Math.round(y)}`,
    ],
  }

  const textStyle = {
    fontFamily: SPACE_MONO,
    fontSize: '0.72rem',
    color: '#fff',
    lineHeight: 1.4,
    textShadow: '1px 1px 0 #3f3f3f',
    whiteSpace: 'pre' as const,
  }

  const colStyle = {
    backgroundColor: 'rgba(0,0,0,0.55)',
    px: 0.5,
    py: 0,
    width: 'fit-content',
    maxWidth: '48vw',
  }

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        pointerEvents: 'none',
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      <Box sx={colStyle}>
        {lines.left.map((line, i) => (
          <Typography key={i} sx={textStyle}>
            {line || '\u00a0'}
          </Typography>
        ))}
      </Box>
      <Box sx={{ ...colStyle, textAlign: 'right' }}>
        {lines.right.map((line, i) => (
          <Typography key={i} sx={textStyle}>
            {line || '\u00a0'}
          </Typography>
        ))}
      </Box>
    </Box>
  )
}

export function Layout() {
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const { isDark, toggleColorMode, palette: c } = useThemeToggle()
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.resolvedLanguage ?? 'en') as Language
  const cycleLanguage = () => {
    const idx = SUPPORTED_LANGUAGES.indexOf(currentLang)
    const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length]
    i18n.changeLanguage(next)
  }

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const [debugOpen, setDebugOpen] = useState(false)
  useSwipeNavigation(!searchOpen)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
      if (e.key === 'F3') {
        e.preventDefault()
        setDebugOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const navLinks = PAGE_LINKS.map(({ to, label }) => {
    const isActive = location.pathname === to
    return (
      <Typography
        key={to}
        component={Link}
        to={to}
        sx={{
          fontFamily: SPACE_MONO,
          fontSize: '0.8rem',
          color: isActive ? 'primary.main' : 'text.secondary',
          textDecoration: 'none',
          '&:hover': { color: 'text.primary' },
          transition: 'color 0.15s',
        }}
      >
        {t(`nav.${label}`)}
      </Typography>
    )
  })

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <Box
        aria-hidden="true"
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: isDark ? 0.025 : 0.05,
          backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <Box component="a" href="#main-content" className="skip-link">
        skip to content
      </Box>

      <SearchBackdrop open={searchOpen} onClose={closeSearch} />
      {debugOpen ? <DebugOverlay /> : null}

      <Box
        component="header"
        sx={{
          position: 'relative',
          zIndex: 10001,
          borderBottom: '1px solid',
          borderColor: searchOpen ? c.coral : 'divider',
          py: 2.5,
          backgroundColor: 'background.default',
          transition: 'border-color 0.2s',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {searchOpen ? (
                <CliSearch open={searchOpen} onClose={closeSearch} />
              ) : (
                <NavBrand onClick={openSearch} />
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 4 },
                opacity: searchOpen ? 0.3 : 1,
                transition: 'opacity 0.2s',
                pointerEvents: searchOpen ? 'none' : 'auto',
                flexShrink: 0,
              }}
            >
              <Box component="nav" sx={{ display: 'flex', gap: { xs: 2, sm: 4 } }}>
                {navLinks}
              </Box>
              <Box sx={{ ml: 1 }}>
                <Tooltip title={isDark ? t('layout.themeLight') : t('layout.themeDark')} arrow>
                  <IconButton
                    onClick={toggleColorMode}
                    size="small"
                    aria-label={isDark ? t('layout.themeLight') : t('layout.themeDark')}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                      transition: 'color 0.15s',
                      '&:focus-visible': {
                        outline: `2px solid ${c.coral}`,
                        outlineOffset: 2,
                      },
                    }}
                  >
                    {isDark ? <LightMode sx={{ fontSize: '1rem' }} /> : <DarkMode sx={{ fontSize: '1rem' }} />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Tooltip title={t('common.language')} arrow>
                <Box
                  component="button"
                  onClick={cycleLanguage}
                  aria-label={t('common.language')}
                  sx={{
                    background: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0,
                    fontFamily: SPACE_MONO,
                    fontSize: '0.7rem',
                    letterSpacing: '0.08em',
                    color: 'text.secondary',
                    px: 1,
                    py: 0.5,
                    cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s',
                    '&:hover': { color: c.coral, borderColor: c.coral },
                    '&:focus-visible': {
                      outline: `2px solid ${c.coral}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  {currentLang.toUpperCase()}
                </Box>
              </Tooltip>
            </Box>
          </Box>
        </Container>
      </Box>

      <Box component="main" id="main-content" sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      <Box
        component="footer"
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 3,
          mt: 'auto',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: { xs: 1.5, sm: 3 },
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              sx={{
                fontFamily: SPACE_MONO,
                fontSize: '0.7rem',
                color: 'text.secondary',
              }}
            >
              &copy; {new Date().getFullYear()} cuong duong
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography
                component="a"
                href="https://linkedin.com/in/cuongduong-dev/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.main' },
                  transition: 'color 0.15s',
                }}
              >
                linkedin
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
