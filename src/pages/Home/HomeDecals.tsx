import { type ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { SPACE_MONO } from '@/theme'
import type { ThemePalette } from '@/theme/palettes'

export const Spec = ({ children, sx }: { children: ReactNode; sx?: object }) => (
  <Typography
    aria-hidden="true"
    sx={{
      fontFamily: SPACE_MONO,
      fontSize: '0.5rem',
      fontWeight: 400,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      opacity: 0.4,
      userSelect: 'none',
      lineHeight: 1,
      ...sx,
    }}
  >
    {children}
  </Typography>
)

export const Barcode = ({ color, sx }: { color: string; sx?: object }) => (
  <Box
    aria-hidden="true"
    sx={{ display: 'flex', gap: '1.5px', alignItems: 'stretch', opacity: 0.2, ...sx }}
  >
    {[3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2].map((w, i) => (
      <Box key={i} sx={{ width: `${w}px`, height: '100%', backgroundColor: color }} />
    ))}
  </Box>
)

export const Rule = ({ color, sx }: { color: string; sx?: object }) => (
  <Box aria-hidden="true" sx={{ height: '1px', backgroundColor: color, opacity: 0.2, ...sx }} />
)

const VertSpec = ({ children, sx }: { children: string; sx?: object }) => (
  <Typography
    aria-hidden="true"
    sx={{
      writingMode: 'vertical-rl',
      fontFamily: SPACE_MONO,
      fontSize: '0.5rem',
      fontWeight: 400,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'text.primary',
      opacity: 0.45,
      userSelect: 'none',
      whiteSpace: 'nowrap',
      lineHeight: 1,
      ...sx,
    }}
  >
    {children}
  </Typography>
)

const HorizSpec = ({ children, sx }: { children: string; sx?: object }) => (
  <Typography
    aria-hidden="true"
    sx={{
      fontFamily: SPACE_MONO,
      fontSize: '0.5rem',
      fontWeight: 400,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'text.primary',
      opacity: 0.35,
      userSelect: 'none',
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      ...sx,
    }}
  >
    {children}
  </Typography>
)

export const BaseDecals = ({ c }: { c: ThemePalette }) => (
  <Box sx={{ display: { xs: 'none', md: 'contents' } }}>
    <VertSpec sx={{ position: 'absolute', left: -24, top: '22%' }}>
      CD—25 Software Engineer
    </VertSpec>
    <VertSpec sx={{ position: 'absolute', right: -24, bottom: '20%' }}>
      Brevity Is The Soul Of Wit
    </VertSpec>
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `radial-gradient(${c.cream} 0.5px, transparent 0.5px)`,
        backgroundSize: '20px 20px',
        opacity: 0.06,
        maskImage: 'radial-gradient(ellipse 65% 45% at 50% 50%, black 10%, transparent 60%)',
        WebkitMaskImage: 'radial-gradient(ellipse 65% 45% at 50% 50%, black 10%, transparent 60%)',
      }}
    />
    <HorizSpec sx={{ position: 'absolute', top: 'calc(50% - 230px)', right: 0, pointerEvents: 'none' }}>
      CD—25 / Rev.03
    </HorizSpec>
  </Box>
)
