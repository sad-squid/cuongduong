import { lightCyber } from '@/theme/palettes'

export const REVISION = 'Rev.03'

export const EDITIONS = [
  { rev: 'Rev.01', descKey: 'colophon.ed1' },
  { rev: 'Rev.02', descKey: 'colophon.ed2' },
  { rev: 'Rev.03', descKey: 'colophon.ed3' },
] as const

// Canonical inks of the paper edition
export const INKS = [
  { nameKey: 'colophon.inkVermillion', hex: lightCyber.coral },
  { nameKey: 'colophon.inkStampBlue', hex: lightCyber.teal },
  { nameKey: 'colophon.inkInk', hex: lightCyber.cream },
  { nameKey: 'colophon.inkPaper', hex: lightCyber.bg },
] as const
