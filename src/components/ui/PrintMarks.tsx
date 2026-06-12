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

export const VertSpec = ({ children, sx }: { children: string; sx?: object }) => (
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

export const HorizSpec = ({ children, sx }: { children: string; sx?: object }) => (
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

export const Folio = ({ children, sx }: { children: string; sx?: object }) => (
  <Typography
    aria-hidden="true"
    sx={{
      fontFamily: SPACE_MONO,
      fontSize: '0.55rem',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      opacity: 0.45,
      userSelect: 'none',
      lineHeight: 1,
      ...sx,
    }}
  >
    {children}
  </Typography>
)

/** Four corner registration marks. Parent must be position: relative. */
export const CropMarks = ({
  color,
  size = 10,
  opacity = 0.5,
  sx,
}: {
  color: string
  size?: number
  opacity?: number
  sx?: object
}) => (
  <Box
    aria-hidden="true"
    sx={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      '& > span': {
        position: 'absolute',
        width: size,
        height: size,
        borderColor: color,
        borderStyle: 'solid',
        opacity,
      },
      '& > .cm-tl': { top: 0, left: 0, borderWidth: '1px 0 0 1px' },
      '& > .cm-tr': { top: 0, right: 0, borderWidth: '1px 1px 0 0' },
      '& > .cm-bl': { bottom: 0, left: 0, borderWidth: '0 0 1px 1px' },
      '& > .cm-br': { bottom: 0, right: 0, borderWidth: '0 1px 1px 0' },
      ...sx,
    }}
  >
    <Box component="span" className="cm-tl" />
    <Box component="span" className="cm-tr" />
    <Box component="span" className="cm-bl" />
    <Box component="span" className="cm-br" />
  </Box>
)

export const BaseDecals = ({ c }: { c: ThemePalette }) => (
  <>
    <VertSpec sx={{ position: 'absolute', left: -24, top: '22%', display: { xs: 'none', md: 'block' } }}>
      CD—25 Software Engineer
    </VertSpec>
    <VertSpec sx={{ position: 'absolute', right: -24, bottom: '20%', display: { xs: 'none', md: 'block' } }}>
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
    <HorizSpec sx={{ position: 'absolute', top: 8, right: 0, pointerEvents: 'none' }}>
      CD—25 / Rev.03
    </HorizSpec>
    <Folio sx={{ position: 'absolute', bottom: 8, left: 0 }}>P.01 / Index</Folio>
    <HorizSpec sx={{ position: 'absolute', top: 8, left: 0, pointerEvents: 'none', display: { xs: 'block', md: 'none' } }}>
      CD—25 · Software Engineer
    </HorizSpec>
    <HorizSpec sx={{ position: 'absolute', bottom: 8, right: 0, pointerEvents: 'none', display: { xs: 'block', md: 'none' }, opacity: 0.3 }}>
      Brevity Is The Soul Of Wit
    </HorizSpec>
  </>
)
