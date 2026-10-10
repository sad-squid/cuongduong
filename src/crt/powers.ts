import { COLORS } from './tokens'

export const POWER_TYPES = ['spread', 'rapid', 'laser', 'hanabi', 'shield', 'slow', 'wow', 'homing', 'glitch', 'tiny', 'mirror'] as const

export type PowerType = (typeof POWER_TYPES)[number]

export type PowerSpec = { glyph: string; tint: string; ms: number; weight: number }

export const POWERS: Record<PowerType, PowerSpec> = {
  spread: { glyph: 'Y', tint: COLORS.beige, ms: 8000, weight: 10 },
  rapid: { glyph: '!', tint: '#C9C4B8', ms: 8000, weight: 9 },
  laser: { glyph: '|', tint: COLORS.cream, ms: 5500, weight: 5 },
  hanabi: { glyph: '花', tint: COLORS.warmCoral, ms: 0, weight: 4 },
  shield: { glyph: 'O', tint: '#C9C4B8', ms: 15000, weight: 8 },
  slow: { glyph: 'Z', tint: '#9A958B', ms: 7000, weight: 7 },
  wow: { glyph: 'W', tint: COLORS.beige, ms: 6000, weight: 4 },
  homing: { glyph: '@', tint: '#DCD7C9', ms: 8000, weight: 8 },
  glitch: { glyph: '#', tint: COLORS.dustyRose, ms: 0, weight: 3 },
  tiny: { glyph: 'x', tint: COLORS.dustyRose, ms: 8000, weight: 6 },
  mirror: { glyph: '?', tint: COLORS.dustyRose, ms: 4000, weight: 2 },
}

export const dropChance = (wave: number) => Math.min(0.2, 0.13 + 0.012 * (wave - 1))

export const PITY_KILLS = 12

export const pickPower = (touch: boolean, random = Math.random) => {
  const pool = POWER_TYPES.filter((type) => !(touch && type === 'mirror'))
  const total = pool.reduce((sum, type) => sum + POWERS[type].weight, 0)
  let roll = random() * total
  for (const type of pool) {
    roll -= POWERS[type].weight
    if (roll < 0) return type
  }
  return pool[pool.length - 1]
}

export const TIMED_SLOTS = 2
