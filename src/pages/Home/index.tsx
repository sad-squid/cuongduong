import { useState, useEffect } from 'react'
import { Box, Container, Typography, IconButton, Stack, Chip } from '@mui/material'
import { Link } from '@tanstack/react-router'
import { GlitchText } from '@/components/ui/GlitchText'
import { SPACE_MONO } from '@/theme'
import { cellEntrance } from '@/theme/animations'
import { useColors } from '@/theme/ThemeContext'
import { DateTime } from 'luxon'
import type { ThemePalette } from '@/theme/palettes'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_META, SUPPORTED_LANGUAGES, type Language } from '@/i18n'
import { Spec, Barcode, Rule, BaseDecals } from './HomeDecals'

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/sad-squid/', symbol: 'gh' },
  { label: 'Instagram', href: 'https://instagram.com/c__squid/', symbol: 'ig' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/cuongduong-dev/', symbol: 'in' },
] as const

const HOVER_NAMES = ['cường dương', '楊 志強']

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useTokyoTime() {
  const [time, setTime] = useState(() =>
    DateTime.now().setZone('Asia/Tokyo').toFormat('HH:mm'),
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(DateTime.now().setZone('Asia/Tokyo').toFormat('HH:mm'))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  return time
}


// ─── Shared cell base ───────────────────────────────────────────────────────

const CELL_BASE = {
  border: '1px solid',
  borderColor: 'divider',
  position: 'relative' as const,
  overflow: 'hidden' as const,
}

const CELL_TRANSITION = {
  transition: 'border-color 0.2s',
}

const NAV_ITEMS = [
  { label: 'about', to: '/about' },
  { label: 'work', to: '/work' },
] as const


const PREVIOUSLY = [
  { co: 'Google', href: 'https://support.google.com', factKey: 'home.factGoogle' },
  { co: 'Zoom', href: 'https://events.zoom.us/', factKey: 'home.factZoom' },
  { co: 'Target', href: 'https://www.target.com', factKey: 'home.factTarget' },
] as const

const PreviouslyChips = ({
  c,
  t,
}: {
  c: ThemePalette
  t: (key: string) => string
}) => {
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {PREVIOUSLY.map(({ co, href }) => (
          <Chip
            key={co}
            label={co}
            variant="outlined"
            size="small"
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            clickable
            onMouseEnter={() => setHovered(co)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(co)}
            onBlur={() => setHovered(null)}
            sx={{
              borderColor: 'divider',
              color: 'text.secondary',
              borderRadius: 0,
              '&:hover': { borderColor: c.coral, color: c.coral },
            }}
          />
        ))}
      </Stack>
      <Box sx={{ minHeight: '2.4em', mt: 1.25 }}>
        <Typography
          sx={{
            fontFamily: SPACE_MONO,
            fontSize: '0.7rem',
            color: 'text.secondary',
            lineHeight: 1.6,
            opacity: hovered ? 0.9 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          {hovered
            ? t(PREVIOUSLY.find((p) => p.co === hovered)!.factKey)
            : '\u00A0'}
        </Typography>
      </Box>
    </>
  )
}

// ─── HomePage ──────────────────────────────────────────────────────────────

export function HomePage() {
  const c = useColors()
  const tokyoTime = useTokyoTime()
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.resolvedLanguage ?? 'en') as Language
  const todayLabel = (() => {
    const now = DateTime.now().setZone('Asia/Tokyo')
    const day = now.day
    const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'
    return now.toFormat(`'today is' cccc, LLLL d'${suffix}', yyyy`).toLowerCase()
  })()

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
          gridTemplateRows: { xs: 'auto', md: 'auto auto auto' },
          gap: 2,
          py: { xs: 6, md: 8 },
          minHeight: 'calc(100svh - 140px)',
          alignContent: 'center',
          position: 'relative',
        }}
      >
        <BaseDecals c={c} />

        {/* ── Hero (col 1, row 1-2) ── */}
        <Box
          sx={{
            ...CELL_BASE,
            gridRow: { md: '1 / 3' },
            p: { xs: 4, md: 5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: `${c.coral}33` },
            ...cellEntrance(0),
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', mb: 2, display: 'block' }}
          >
            {t('home.overline')}
          </Typography>

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.8rem', sm: '4rem', md: '5rem' },
              lineHeight: 1.05,
              mb: 3,
              cursor: 'default',
            }}
          >
            <GlitchText type="hover" hoverTexts={HOVER_NAMES.filter((n) => n !== t('home.name'))} autoOnMount>
              {t('home.name')}
            </GlitchText>
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: c.teal,
                animation: 'statusPulse 2s ease-in-out infinite',
                '@keyframes statusPulse': {
                  '0%, 100%': { opacity: 0.4 },
                  '50%': { opacity: 1 },
                },
              }}
            />
            <Typography
              sx={{
                fontFamily: SPACE_MONO,
                fontSize: '0.75rem',
                color: 'text.secondary',
                letterSpacing: '0.03em',
              }}
            >
              {todayLabel}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: { xs: '1rem', md: '1.05rem' },
              color: 'text.secondary',
              lineHeight: 1.8,
              maxWidth: 520,
              mb: 4,
            }}
          >
            {t('home.bio')}
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
            {SOCIAL_LINKS.map(({ label, href, symbol }) => (
              <IconButton
                key={label}
                component="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                size="small"
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0,
                  px: 1.5,
                  '&:hover': {
                    color: 'primary.main',
                    borderColor: 'primary.main',
                    background: `${c.coral}0A`,
                  },
                  transition: 'all 0.15s',
                }}
              >
                {symbol}
              </IconButton>
            ))}
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Rule color={c.cream} sx={{ flex: 1 }} />
            <Spec>{t('common.portfolio')}</Spec>
            <Barcode color={c.cream} sx={{ height: 10 }} />
          </Box>
        </Box>

        {/* ── Status + Now (col 2, row 1) ── */}
        <Box
          sx={{
            ...CELL_BASE,
            ...CELL_TRANSITION,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            p: 4,
            '&:hover': { borderColor: `${c.coral}55` },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '15%',
              bottom: '15%',
              width: 2,
              backgroundColor: c.coral,
              opacity: 0,
              transition: 'opacity 0.3s',
            },
            '&:hover::before': { opacity: 0.4 },
            '&:hover .now-bullet': { opacity: 1, transform: 'translateX(0)' },
            ...cellEntrance(100),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: c.coral,
                animation: 'statusPulse 2s ease-in-out infinite',
                '@keyframes statusPulse': {
                  '0%, 100%': { opacity: 0.4 },
                  '50%': { opacity: 1 },
                },
              }}
            />
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', display: 'block' }}
            >
              {t('home.role')}
            </Typography>
          </Box>
          <Typography
            sx={{ fontFamily: SPACE_MONO, fontSize: '0.85rem', color: 'text.primary', mb: 0.5, mt: 1 }}
          >
            {t('home.roleTitle')}
          </Typography>
          <Typography
            sx={{ fontFamily: SPACE_MONO, fontSize: '0.8rem', color: 'text.secondary' }}
          >
            {t('home.roleOrg')}
          </Typography>

          <Rule color={c.cream} sx={{ my: 2 }} />

          <Typography
            variant="overline"
            sx={{ color: 'primary.main', display: 'block', mb: 1.5 }}
          >
            {t('common.previously')}
          </Typography>
          <PreviouslyChips c={c} t={t} />

        </Box>

        {/* ── Tagline (col 2, row 2) ── */}
        <Box
          sx={{
            ...CELL_BASE,
            ...CELL_TRANSITION,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'stretch',
            p: 0,
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: `${c.coral}55` },
            '&:hover .tagline-block': { width: 12 },
            '&:hover .tagline-text': { letterSpacing: '0.1em', color: c.coral },
            ...cellEntrance(200),
          }}
        >
          <Box
            className="tagline-block"
            aria-hidden="true"
            sx={{
              width: 8,
              backgroundColor: c.coral,
              flexShrink: 0,
              transition: 'width 0.25s ease',
            }}
          />
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
            }}
          >
            <Typography
              className="tagline-text"
              sx={{
                fontFamily: SPACE_MONO,
                fontSize: '0.85rem',
                color: 'text.secondary',
                textAlign: 'center',
                letterSpacing: '0.05em',
                lineHeight: 1.8,
                transition: 'letter-spacing 0.4s ease, color 0.3s ease',
              }}
            >
              {t('home.tagline1')}
              <br />
              {t('home.tagline2')}
            </Typography>
          </Box>
          <Box
            aria-hidden="true"
            sx={{
              width: 2,
              backgroundColor: c.teal,
              flexShrink: 0,
              opacity: 0.6,
            }}
          />
        </Box>

        {/* ── Row 3 left — nav ── */}
        <Box
          sx={{
            ...CELL_BASE,
            ...CELL_TRANSITION,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            p: 3,
            '&:hover': { borderColor: `${c.coral}55` },
            ...cellEntrance(300),
          }}
        >
          <Stack spacing={0.75}>
            {NAV_ITEMS.map(({ label, to }, i) => {
              const navLabel = t(`nav.${label}`)
              const colors = [c.coral, c.teal, c.roseText]
              return (
                <Box
                  key={label}
                  component={Link}
                  to={to}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    textDecoration: 'none',
                    transition: 'padding-left 0.2s',
                    pl: 0,
                    '&:hover': { pl: 1 },
                    '&:hover .nav-swatch': { width: 12, opacity: 1 },
                    '&:hover .nav-label': { color: c.coral },
                  }}
                >
                  <Box
                    className="nav-swatch"
                    aria-hidden="true"
                    sx={{
                      width: 8,
                      height: 8,
                      backgroundColor: colors[i],
                      opacity: 0.7,
                      transition: 'width 0.2s ease, opacity 0.2s ease',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    className="nav-label"
                    sx={{
                      fontFamily: SPACE_MONO,
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                      transition: 'color 0.15s',
                    }}
                  >
                    /{navLabel}
                  </Typography>
                </Box>
              )
            })}
          </Stack>
        </Box>

        {/* ── Row 3 right — location + lang ── */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            gap: 2,
          }}
        >
          {/* Location — time pulses on hover */}
          <Box
            sx={{
              ...CELL_BASE,
              ...CELL_TRANSITION,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              '&:hover': { borderColor: `${c.coral}55` },
              '&:hover .loc-time': {
                animation: 'pulse 2s ease-in-out infinite',
              },
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.7 },
                '50%': { opacity: 1 },
              },
              ...cellEntrance(400),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 18,
                  height: 18,
                  backgroundColor: c.coral,
                  position: 'relative',
                  flexShrink: 0,
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: '50% 0 0 0',
                    backgroundColor: c.roseText,
                    opacity: 0.4,
                  },
                }}
              />
              <Box>
                <Typography
                  sx={{ fontFamily: SPACE_MONO, fontSize: '0.8rem', color: 'text.primary' }}
                >
                  {t('home.locationCity')}
                </Typography>
                <Typography
                  sx={{ fontFamily: SPACE_MONO, fontSize: '0.65rem', color: 'text.secondary', mt: 0.5 }}
                >
                  35°N 139°E
                </Typography>
              </Box>
            </Box>
            <Typography
              className="loc-time"
              sx={{ fontFamily: SPACE_MONO, fontSize: '0.85rem', color: 'text.secondary' }}
            >
              {tokyoTime}
            </Typography>
          </Box>

          {/* Languages — colored tiles */}
          <Box
            sx={{
              ...CELL_BASE,
              ...CELL_TRANSITION,
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              p: 1.5,
              gap: 0.75,
              '&:hover': { borderColor: `${c.coral}55` },
              ...cellEntrance(500),
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontSize: '0.55rem', lineHeight: 1, mb: 0.5, px: 0.5 }}
            >
              {t('home.speaks')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {SUPPORTED_LANGUAGES.map((lng) => {
                const { code, name } = LANGUAGE_META[lng]
                const bg = { en: c.coral, vi: c.teal, ja: c.roseText }[lng]
                const active = currentLang === lng
                return (
                  <Box
                    key={lng}
                    component="button"
                    onClick={() => i18n.changeLanguage(lng)}
                    aria-label={`${t('common.language')}: ${name}`}
                    aria-pressed={active}
                    title={name}
                    sx={{
                      backgroundColor: bg,
                      color: c.bg,
                      fontFamily: SPACE_MONO,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      px: 1,
                      py: 0.75,
                      minWidth: 28,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: 'none',
                      outline: active ? `2px solid ${c.cream}` : '2px solid transparent',
                      outlineOffset: 2,
                      opacity: active ? 1 : 0.55,
                      transition: 'transform 0.15s, opacity 0.15s, outline-color 0.15s',
                      '&:hover': { transform: 'translateY(-1px)', opacity: 1 },
                    }}
                  >
                    {code}
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  )
}
