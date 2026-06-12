import { useState, useEffect } from 'react'
import { Box, Container, Typography, IconButton, Stack } from '@mui/material'
import { Link } from '@tanstack/react-router'
import { GlitchText } from '@/components/ui/GlitchText'
import { SPACE_MONO } from '@/theme'
import { cellEntrance, ruleDraw } from '@/theme/animations'
import { useColors } from '@/theme/ThemeContext'
import { DateTime } from 'luxon'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_META, SUPPORTED_LANGUAGES, type Language } from '@/i18n'
import { Rule, CropMarks, BaseDecals } from '@/components/ui/PrintMarks'

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/sad-squid/', symbol: 'gh' },
  { label: 'Instagram', href: 'https://instagram.com/c__squid/', symbol: 'ig' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/cuongduong-dev/', symbol: 'in' },
] as const

const DISPLAY_NAMES = ['cuong duong', 'cường dương', '楊 志強']

// One row per writing system; `lang` marks which locale it leads in
const SPECIMENS = [
  { lang: 'en', label: 'EN', nameKey: 'about.nameEn', ipaKey: 'about.pronounceEn' },
  { lang: 'vi', label: 'VI', nameKey: 'about.nameVi', ipaKey: 'about.pronounceVi' },
  { lang: 'ja', label: 'ZH · JA', nameKey: 'about.nameZh', ipaKey: 'about.pronounceZh' },
] as const

const NAV_ITEMS = [
  { no: '01', label: 'work', to: '/work' },
  { no: '02', label: 'about', to: '/about' },
  { no: '03', label: 'notes', to: '/notes' },
] as const

const PREVIOUSLY = [
  { mark: '¹', co: 'google', href: 'https://support.google.com', factKey: 'home.factGoogle' },
  { mark: '²', co: 'zoom', href: 'https://events.zoom.us/', factKey: 'home.factZoom' },
  { mark: '³', co: 'target', href: 'https://www.target.com', factKey: 'home.factTarget' },
] as const

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

// ─── HomePage ──────────────────────────────────────────────────────────────

export function HomePaper() {
  const c = useColors()
  const tokyoTime = useTokyoTime()
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.resolvedLanguage ?? 'en') as Language
  const dateLabel = DateTime.now()
    .setZone('Asia/Tokyo')
    .setLocale(currentLang)
    .toLocaleString(DateTime.DATE_HUGE)
    .toLowerCase()

  const monoLabel = {
    fontFamily: SPACE_MONO,
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: 'primary.main',
  }

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          position: 'relative',
          py: { xs: 7, md: 8 },
          minHeight: 'calc(100svh - 140px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <BaseDecals c={c} />

        <Box sx={{ maxWidth: 860, mx: 'auto', width: '100%', position: 'relative', px: { xs: 0, md: 2 } }}>
          <CropMarks color={c.cream} size={12} opacity={0.35} sx={{ inset: { xs: -8, md: -20 } }} />

          {/* ── Dateline ── */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 1,
              mb: 1.5,
              ...cellEntrance(0),
            }}
          >
            <Typography
              sx={{
                fontFamily: SPACE_MONO,
                fontSize: '0.7rem',
                color: 'text.secondary',
                letterSpacing: '0.04em',
              }}
            >
              {t('home.locationCity')} · 35°N 139°E — {dateLabel} — {tokyoTime} JST
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              {SUPPORTED_LANGUAGES.map((lng, i) => {
                const { code, name } = LANGUAGE_META[lng]
                const active = currentLang === lng
                return (
                  <Box key={lng} sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    {i > 0 && (
                      <Typography component="span" aria-hidden="true" sx={{ fontFamily: SPACE_MONO, fontSize: '0.7rem', color: 'text.secondary', opacity: 0.4 }}>
                        ·
                      </Typography>
                    )}
                    <Box
                      component="button"
                      onClick={() => i18n.changeLanguage(lng)}
                      aria-label={`${t('common.language')}: ${name}`}
                      aria-pressed={active}
                      sx={{
                        background: 'none',
                        border: 'none',
                        p: 0,
                        cursor: 'pointer',
                        fontFamily: SPACE_MONO,
                        fontSize: '0.7rem',
                        letterSpacing: '0.08em',
                        color: active ? 'primary.main' : 'text.secondary',
                        opacity: active ? 1 : 0.6,
                        textDecoration: active ? 'underline' : 'none',
                        textUnderlineOffset: 3,
                        transition: 'color 0.15s, opacity 0.15s',
                        '&:hover': { color: c.coral, opacity: 1 },
                        '&:focus-visible': { outline: `2px solid ${c.coral}`, outlineOffset: 2 },
                      }}
                    >
                      {code.toLowerCase()}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>

          <Rule color={c.cream} sx={{ mb: { xs: 4, md: 5 }, ...ruleDraw(150) }} />

          {/* ── Specimen hero ── */}
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', display: 'block', mb: 1.5, ...cellEntrance(100) }}
            >
              {t('home.overline')}
            </Typography>

            <Typography
              variant="h1"
              sx={{
                fontSize: 'clamp(3rem, 9vw, 6.25rem)',
                lineHeight: 1.05,
                mb: { xs: 3, md: 4 },
                cursor: 'default',
                ...cellEntrance(180),
              }}
            >
              <GlitchText
                type="hover"
                hoverTexts={DISPLAY_NAMES.filter((n) => n !== t('home.name'))}
                autoOnMount
              >
                {t('home.name')}
              </GlitchText>
            </Typography>

            {/* Specimen rows — the same name through three plates */}
            <Box sx={{ mb: { xs: 4, md: 5 } }}>
              {SPECIMENS.map(({ lang, label, nameKey, ipaKey }, i) => {
                const active = currentLang === lang
                return (
                  <Box
                    key={lang}
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: { xs: 1.5, md: 2.5 },
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:first-of-type': { borderTop: '1px solid', borderTopColor: 'divider' },
                      ...cellEntrance(300 + i * 110),
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        ...monoLabel,
                        color: active ? 'primary.main' : 'text.secondary',
                        opacity: active ? 1 : 0.5,
                        flexShrink: 0,
                        width: { xs: 44, md: 56 },
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      component="span"
                      variant="h2"
                      sx={{
                        fontSize: { xs: '1.15rem', md: '1.5rem' },
                        textTransform: 'lowercase',
                        color: 'text.primary',
                        lineHeight: 1.3,
                      }}
                    >
                      {t(nameKey)}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: SPACE_MONO,
                        fontSize: '0.65rem',
                        color: 'text.secondary',
                        opacity: 0.7,
                        ml: 'auto',
                        flexShrink: 0,
                        display: { xs: 'none', sm: 'inline' },
                      }}
                    >
                      {t(ipaKey)}
                    </Typography>
                  </Box>
                )
              })}
            </Box>

            {/* ── Dek ── */}
            <Typography
              sx={{
                fontSize: { xs: '1.05rem', md: '1.2rem' },
                color: 'text.primary',
                lineHeight: 1.8,
                maxWidth: '36em',
                mb: { xs: 4, md: 5 },
                ...cellEntrance(680),
              }}
            >
              {t('home.bio')}
            </Typography>
          </Box>

          {/* ── Currently / past lives ── */}
          <Box sx={{ mb: { xs: 4, md: 5 } }}>
            {[
              { label: t('common.currently'), line: t('home.currentlyLine') },
              { label: t('home.pastLivesLabel'), line: t('home.pastLives') },
            ].map(({ label, line }, i) => (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: { xs: 1.5, md: 2.5 },
                  py: 0.75,
                  ...cellEntrance(760 + i * 70),
                }}
              >
                <Typography component="span" sx={{ ...monoLabel, flexShrink: 0, width: { xs: 84, md: 96 } }}>
                  {label}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SPACE_MONO,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    lineHeight: 1.8,
                  }}
                >
                  {line}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* ── Previously, as footnotes ── */}
          <Box sx={{ mb: { xs: 4, md: 5 }, ...cellEntrance(920) }}>
            <Typography sx={{ ...monoLabel, display: 'block', mb: 1.5 }}>
              {t('common.previously')}
            </Typography>
            {PREVIOUSLY.map(({ mark, co, href, factKey }) => (
              <Typography
                key={co}
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  lineHeight: 2,
                }}
              >
                <Box component="span" aria-hidden="true" sx={{ color: c.coral, mr: 0.75 }}>
                  {mark}
                </Box>
                <Box
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'text.primary',
                    textDecoration: 'underline',
                    textDecorationColor: 'transparent',
                    textUnderlineOffset: 3,
                    transition: 'color 0.15s, text-decoration-color 0.15s',
                    '&:hover': { color: c.coral, textDecorationColor: c.coral },
                  }}
                >
                  {co}
                </Box>
                {' — '}
                {t(factKey)}
              </Typography>
            ))}
          </Box>

          {/* ── Index strip + social ── */}
          <Box>
            <Box component="nav" sx={{ mb: { xs: 3, md: 4 } }}>
              {NAV_ITEMS.map(({ no, label, to }, i) => (
                <Box
                  key={label}
                  component={Link}
                  to={to}
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 1.5,
                    py: 1.25,
                    textDecoration: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:first-of-type': { borderTop: '1px solid', borderTopColor: 'divider' },
                    '&:hover .toc-label': { color: c.coral },
                    '&:hover .toc-arrow': { color: c.coral, transform: 'translateX(4px)' },
                    ...cellEntrance(1040 + i * 70),
                  }}
                >
                  <Typography component="span" sx={{ ...monoLabel, color: 'text.secondary', opacity: 0.6 }}>
                    {no}
                  </Typography>
                  <Typography
                    component="span"
                    className="toc-label"
                    sx={{
                      fontFamily: SPACE_MONO,
                      fontSize: '0.85rem',
                      color: 'text.primary',
                      transition: 'color 0.15s',
                    }}
                  >
                    {t(`nav.${label}`)}
                  </Typography>
                  <Box
                    aria-hidden="true"
                    sx={{
                      flex: 1,
                      borderBottom: '1px dotted',
                      borderColor: 'divider',
                      alignSelf: 'center',
                      mx: 1,
                    }}
                  />
                  <Typography
                    component="span"
                    className="toc-arrow"
                    aria-hidden="true"
                    sx={{
                      fontFamily: SPACE_MONO,
                      fontSize: '0.85rem',
                      color: 'text.secondary',
                      transition: 'color 0.15s, transform 0.2s',
                    }}
                  >
                    →
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                ...cellEntrance(1280),
              }}
            >
              <Stack direction="row" spacing={1.5}>
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
              <Typography
                sx={{
                  fontFamily: '"Fraunces", serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: '0.95rem',
                  color: 'text.secondary',
                }}
              >
                {t('home.tagline1')} {t('home.tagline2')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  )
}
