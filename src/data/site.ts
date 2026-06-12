import { lightCyber } from '@/theme/palettes'

export const REVISION = 'Rev.03'

export const EDITIONS = [
  { rev: 'Rev.01', descKey: 'site.siteEd1' },
  { rev: 'Rev.02', descKey: 'site.siteEd2' },
  { rev: 'Rev.03', descKey: 'site.siteEd3' },
] as const

// Canonical inks of the paper edition
export const INKS = [
  { nameKey: 'site.inkVermillion', hex: lightCyber.coral },
  { nameKey: 'site.inkStampBlue', hex: lightCyber.teal },
  { nameKey: 'site.inkInk', hex: lightCyber.cream },
  { nameKey: 'site.inkPaper', hex: lightCyber.bg },
] as const
