import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Box, Container, Typography, Chip, Stack } from '@mui/material'
import { SPACE_MONO } from '@/theme'
import { useColors } from '@/theme/ThemeContext'
import type { ThemePalette } from '@/theme/palettes'
import { useTranslation } from 'react-i18next'
import { GlitchText } from '@/components/ui/GlitchText'

const ROLE_KEYS = ['smartnews', 'google', 'zoom', 'target'] as const
type RoleKey = (typeof ROLE_KEYS)[number]

type RoleMeta = {
  accent: 'coral' | 'teal' | 'roseText' | 'warmCoral' | 'dustyRose'
  tags: string[]
  start: [number, number]
  end: [number, number] | null
}

const ROLE_META: Record<RoleKey, RoleMeta> = {
  smartnews: {
    accent: 'coral',
    tags: ['React Native', 'Expo', 'LLM', 'TypeScript'],
    start: [2024, 7],
    end: null,
  },
  google: {
    accent: 'teal',
    tags: ['Accessibility', 'Design Systems', 'i18n', 'React'],
    start: [2022, 4],
    end: [2024, 6],
  },
  zoom: {
    accent: 'roseText',
    tags: ['Design Systems', 'CI/CD', 'Testing', 'Mentorship'],
    start: [2021, 3],
    end: [2022, 3],
  },
  target: {
    accent: 'warmCoral',
    tags: ['Web Perf', 'SEO', 'Design Systems', 'Scale'],
    start: [2017, 7],
    end: [2021, 2],
  },
}

const monthsFrom = (origin: [number, number], point: [number, number]) =>
  (point[0] - origin[0]) * 12 + (point[1] - origin[1])

const ENTRANCE = (delay: number) => ({
  '@keyframes cellEnter': {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `cellEnter 0.5s ease-out ${delay}ms both`,
  },
})

const EPOCH: [number, number] = [2017, 7]
const now = new Date()
const PRESENT: [number, number] = [now.getFullYear(), now.getMonth() + 1]
const TOTAL_MONTHS = monthsFrom(EPOCH, PRESENT)

const ROLE_SPANS = ROLE_KEYS.map((key) => {
  const meta = ROLE_META[key]
  const startM = monthsFrom(EPOCH, meta.start)
  const endM = meta.end ? monthsFrom(EPOCH, meta.end) : TOTAL_MONTHS
  return {
    key,
    startPct: (startM / TOTAL_MONTHS) * 100,
    endPct: (endM / TOTAL_MONTHS) * 100,
  }
})

const YEAR_TICKS = (() => {
  const ticks: { year: number; pct: number }[] = []
  for (let y = EPOCH[0]; y <= PRESENT[0]; y++) {
    const m = monthsFrom(EPOCH, [y, 1])
    if (m < 0 || m > TOTAL_MONTHS) continue
    ticks.push({ year: y, pct: (m / TOTAL_MONTHS) * 100 })
  }
  return ticks
})()

const MIN_WINDOW_PCT = 8
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

type DragMode = 'move' | 'left' | 'right' | null

function Timeline({
  c,
  t,
  windowRange,
  setWindowRange,
}: {
  c: ThemePalette
  t: (key: string) => string
  windowRange: [number, number]
  setWindowRange: (r: [number, number]) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const shadeLeftRef = useRef<HTMLDivElement>(null)
  const shadeRightRef = useRef<HTMLDivElement>(null)
  const liveRange = useRef<[number, number]>(windowRange)
  const rafId = useRef<number | null>(null)
  const dragState = useRef<{
    mode: DragMode
    startX: number
    initial: [number, number]
  }>({ mode: null, startX: 0, initial: [0, 100] })
  const wheelCommitTimer = useRef<number | null>(null)

  const paintVisual = useCallback(() => {
    rafId.current = null
    const [a, b] = liveRange.current
    if (windowRef.current) {
      windowRef.current.style.left = `${a}%`
      windowRef.current.style.width = `${b - a}%`
    }
    if (shadeLeftRef.current) shadeLeftRef.current.style.width = `${a}%`
    if (shadeRightRef.current) {
      shadeRightRef.current.style.left = `${b}%`
      shadeRightRef.current.style.width = `${100 - b}%`
    }
  }, [])

  const scheduleRepaint = useCallback(() => {
    if (rafId.current != null) return
    rafId.current = requestAnimationFrame(paintVisual)
  }, [paintVisual])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const { mode, startX, initial } = dragState.current
      if (!mode || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const deltaPct = ((e.clientX - startX) / rect.width) * 100
      const [a, b] = initial
      let next: [number, number]
      if (mode === 'left') {
        next = [clamp(a + deltaPct, 0, b - MIN_WINDOW_PCT), b]
      } else if (mode === 'right') {
        next = [a, clamp(b + deltaPct, a + MIN_WINDOW_PCT, 100)]
      } else {
        const width = b - a
        const newA = clamp(a + deltaPct, 0, 100 - width)
        next = [newA, newA + width]
      }
      liveRange.current = next
      scheduleRepaint()
    },
    [scheduleRepaint],
  )

  const dragAbortRef = useRef<AbortController | null>(null)

  const onPointerUp = useCallback(() => {
    dragState.current.mode = null
    dragAbortRef.current?.abort()
    dragAbortRef.current = null
    setWindowRange(liveRange.current)
  }, [setWindowRange])

  const startDrag = (mode: Exclude<DragMode, null>) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragState.current = {
      mode,
      startX: e.clientX,
      initial: [...liveRange.current] as [number, number],
    }
    const controller = new AbortController()
    dragAbortRef.current = controller
    window.addEventListener('pointermove', onPointerMove, { signal: controller.signal })
    window.addEventListener('pointerup', onPointerUp, { signal: controller.signal })
  }

  const onTrackWheel = useCallback(
    (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      const [a, b] = liveRange.current
      const width = b - a
      const center = (a + b) / 2
      const zoom = 1 - e.deltaY * 0.002
      const newWidth = clamp(width * zoom, MIN_WINDOW_PCT, 100)
      let newA = center - newWidth / 2
      let newB = center + newWidth / 2
      if (newA < 0) {
        newB -= newA
        newA = 0
      }
      if (newB > 100) {
        newA -= newB - 100
        newB = 100
      }
      liveRange.current = [newA, newB]
      scheduleRepaint()
      if (wheelCommitTimer.current != null) window.clearTimeout(wheelCommitTimer.current)
      wheelCommitTimer.current = window.setTimeout(() => {
        setWindowRange(liveRange.current)
      }, 120)
    },
    [scheduleRepaint, setWindowRange],
  )

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
    const [a, b] = liveRange.current
    const width = b - a
    const newA = clamp(pct - width / 2, 0, 100 - width)
    const next: [number, number] = [newA, newA + width]
    liveRange.current = next
    paintVisual()
    setWindowRange(next)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('wheel', onTrackWheel, { passive: false })
    return () => el.removeEventListener('wheel', onTrackWheel)
  }, [onTrackWheel])

  useEffect(() => {
    liveRange.current = windowRange
    paintVisual()
  }, [windowRange, paintVisual])

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
      if (wheelCommitTimer.current != null) window.clearTimeout(wheelCommitTimer.current)
    },
    [onPointerMove, onPointerUp],
  )

  const [wA, wB] = windowRange

  return (
    <Box sx={{ mb: { xs: 5, md: 7 }, ...ENTRANCE(0) }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="overline"
          aria-hidden="true"
          sx={{
            fontFamily: SPACE_MONO,
            fontSize: '0.55rem',
            color: 'text.secondary',
            opacity: 0.5,
            letterSpacing: '0.2em',
          }}
        >
          {t('work.timelineLabel')}
        </Typography>
        <Typography
          sx={{
            fontFamily: SPACE_MONO,
            fontSize: '0.6rem',
            color: 'text.secondary',
            opacity: 0.6,
          }}
        >
          {t('work.timelineHint')}
        </Typography>
      </Box>

      <Box
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        sx={{
          position: 'relative',
          height: 56,
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          userSelect: 'none',
          touchAction: 'none',
          cursor: 'pointer',
        }}
      >
        {/* year ticks */}
        {YEAR_TICKS.map(({ year, pct }) => (
          <Box
            key={year}
            aria-hidden="true"
            sx={{
              position: 'absolute',
              left: `${pct}%`,
              top: 0,
              bottom: 0,
              borderLeft: '1px dashed',
              borderColor: 'divider',
              opacity: 0.5,
            }}
          >
            <Typography
              sx={{
                position: 'absolute',
                bottom: -16,
                left: 2,
                fontFamily: SPACE_MONO,
                fontSize: '0.55rem',
                color: 'text.secondary',
                opacity: 0.6,
              }}
            >
              {`'${String(year).slice(2)}`}
            </Typography>
          </Box>
        ))}

        {/* role bars */}
        {ROLE_SPANS.map(({ key, startPct, endPct }, i) => {
          const color = c[ROLE_META[key].accent]
          return (
            <Box
              key={key}
              component="a"
              href={`#${key}`}
              onPointerDown={(e) => e.stopPropagation()}
              sx={{
                position: 'absolute',
                left: `${startPct}%`,
                width: `${endPct - startPct}%`,
                top: 8 + i * 10,
                height: 8,
                backgroundColor: color,
                opacity: 0.85,
                transition: 'opacity 0.15s',
                '&:hover': { opacity: 1 },
                cursor: 'pointer',
              }}
              aria-label={t(`work.roles.${key}.company`)}
            />
          )
        })}

        {/* shaded regions outside window */}
        <Box
          ref={shadeLeftRef}
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${wA}%`,
            backgroundColor: c.bg,
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        />
        <Box
          ref={shadeRightRef}
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${wB}%`,
            width: `${100 - wB}%`,
            backgroundColor: c.bg,
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        />

        {/* window */}
        <Box
          ref={windowRef}
          onPointerDown={startDrag('move')}
          onKeyDown={(e: React.KeyboardEvent) => {
            const step = e.shiftKey ? 10 : 3
            const [a, b] = liveRange.current
            const width = b - a
            let next: [number, number] | null = null
            if (e.key === 'ArrowLeft') next = [clamp(a - step, 0, 100 - width), clamp(a - step, 0, 100 - width) + width]
            else if (e.key === 'ArrowRight') next = [clamp(a + step, 0, 100 - width), clamp(a + step, 0, 100 - width) + width]
            else if (e.key === 'ArrowDown') {
              const w = Math.max(MIN_WINDOW_PCT, width - step)
              const c = (a + b) / 2
              next = [clamp(c - w / 2, 0, 100 - w), clamp(c - w / 2, 0, 100 - w) + w]
            } else if (e.key === 'ArrowUp') {
              const w = Math.min(100, width + step)
              const c = (a + b) / 2
              next = [clamp(c - w / 2, 0, 100 - w), clamp(c - w / 2, 0, 100 - w) + w]
            } else if (e.key === 'Home') next = [0, width]
            else if (e.key === 'End') next = [100 - width, 100]
            if (next) {
              e.preventDefault()
              liveRange.current = next
              paintVisual()
              setWindowRange(next)
            }
          }}
          role="slider"
          aria-label="timeline window"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((wA + wB) / 2)}
          tabIndex={0}
          sx={{
            position: 'absolute',
            left: `${wA}%`,
            width: `${wB - wA}%`,
            top: 0,
            bottom: 0,
            border: '1px solid',
            borderColor: 'text.primary',
            backgroundColor: 'transparent',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
            '&:focus-visible': {
              outline: `2px solid ${c.coral}`,
              outlineOffset: 2,
            },
          }}
        >
          <Box
            onPointerDown={startDrag('left')}
            aria-label="window start"
            sx={{
              position: 'absolute',
              left: -14,
              top: -10,
              bottom: -10,
              width: 28,
              cursor: 'ew-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&::after': {
                content: '""',
                width: 16,
                height: 'calc(100% + 8px)',
                backgroundColor: 'text.primary',
                opacity: 0.35,
                borderRadius: '3px',
                transition: 'opacity 0.15s',
              },
              '&:hover::after': { opacity: 0.6 },
            }}
          />
          <Box
            onPointerDown={startDrag('right')}
            aria-label="window end"
            sx={{
              position: 'absolute',
              right: -14,
              top: -10,
              bottom: -10,
              width: 28,
              cursor: 'ew-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&::after': {
                content: '""',
                width: 16,
                height: 'calc(100% + 8px)',
                backgroundColor: 'text.primary',
                opacity: 0.35,
                borderRadius: '3px',
                transition: 'opacity 0.15s',
              },
              '&:hover::after': { opacity: 0.6 },
            }}
          />
        </Box>
      </Box>
      <Box sx={{ height: 14 }} />
    </Box>
  )
}

export function WorkPage() {
  const c = useColors()
  const { t } = useTranslation()
  const [windowRange, setWindowRange] = useState<[number, number]>([0, 100])

  const visibleKeys = useMemo(() => {
    const [wA, wB] = windowRange
    return ROLE_SPANS.filter(({ startPct, endPct }) => endPct >= wA && startPct <= wB).map((s) => s.key)
  }, [windowRange])

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Box sx={{ mb: { xs: 4, md: 6 } }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', display: 'block', mb: 2 }}
          >
            {t('work.overline')}
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4rem' },
              lineHeight: 1.1,
              mb: 2,
            }}
          >
            {t('work.title')}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '0.95rem', md: '1.05rem' },
              color: 'text.secondary',
              lineHeight: 1.7,
              maxWidth: 640,
            }}
          >
            <GlitchText type="hover" sticky hoverTexts={[t('work.subtitleAlt')]} intensity={0.6}>
              {t('work.subtitle')}
            </GlitchText>
          </Typography>
        </Box>

        <Timeline c={c} t={t} windowRange={windowRange} setWindowRange={setWindowRange} />

        <Stack spacing={2}>
          {ROLE_KEYS.filter((k) => visibleKeys.includes(k)).map((key, i) => {
            const accent = c[ROLE_META[key].accent]
            return (
              <Box
                key={key}
                id={key}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  p: { xs: 3, md: 4 },
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: `${accent}55` },
                  '&:hover .role-accent': { width: 6 },
                  scrollMarginTop: 96,
                  ...ENTRANCE(100 + i * 100),
                }}
              >
                <Box
                  className="role-accent"
                  aria-hidden="true"
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    backgroundColor: accent,
                    transition: 'width 0.25s ease',
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', md: 'baseline' },
                    gap: 1,
                    mb: 2,
                    pl: { xs: 1, md: 1.5 },
                  }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
                    >
                      {t(`work.roles.${key}.company`)}
                    </Typography>
                    <Typography
                      sx={{ fontFamily: SPACE_MONO, fontSize: '0.85rem', color: 'text.secondary' }}
                    >
                      {t(`work.roles.${key}.role`)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: SPACE_MONO,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {t(`work.roles.${key}.dates`)}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    pl: { xs: 1, md: 1.5 },
                    color: 'text.primary',
                    fontSize: { xs: '0.95rem', md: '1rem' },
                    lineHeight: 1.7,
                    mb: 2,
                  }}
                >
                  {t(`work.roles.${key}.scope`)}
                </Typography>

                <Box
                  component="ul"
                  sx={{
                    pl: { xs: 3, md: 3.5 },
                    m: 0,
                    mb: 2.5,
                    '& li': {
                      color: 'text.secondary',
                      fontSize: '0.9rem',
                      lineHeight: 1.7,
                      mb: 0.5,
                      '&::marker': { color: accent },
                    },
                  }}
                >
                  <li>{t(`work.roles.${key}.bullet1`)}</li>
                  <li>{t(`work.roles.${key}.bullet2`)}</li>
                  <li>{t(`work.roles.${key}.bullet3`)}</li>
                </Box>

                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ pl: { xs: 1, md: 1.5 }, flexWrap: 'wrap', rowGap: 0.75 }}
                >
                  {ROLE_META[key].tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderRadius: 0,
                        borderColor: 'divider',
                        color: 'text.secondary',
                        fontFamily: SPACE_MONO,
                        fontSize: '0.65rem',
                        height: 22,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )
          })}
        </Stack>
      </Box>
    </Container>
  )
}
