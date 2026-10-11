import { COLORS } from './tokens'

export const POWER_TYPES = ['spread', 'rapid', 'laser', 'hanabi', 'shield', 'wow', 'homing', 'glitch', 'wingmen', 'big', 'chain'] as const

export type PowerType = (typeof POWER_TYPES)[number]

type PowerSpec = { glyph: string; tint: string; ms: number; weight: number }

export const POWERS: Record<PowerType, PowerSpec> = {
  spread: { glyph: 'Y', tint: COLORS.beige, ms: 8000, weight: 10 },
  rapid: { glyph: '!', tint: '#C9C4B8', ms: 8000, weight: 9 },
  laser: { glyph: '|', tint: COLORS.cream, ms: 5500, weight: 5 },
  hanabi: { glyph: '花', tint: COLORS.warmCoral, ms: 8000, weight: 6 },
  shield: { glyph: 'O', tint: '#C9C4B8', ms: 15000, weight: 8 },
  wow: { glyph: 'W', tint: COLORS.beige, ms: 7000, weight: 5 },
  homing: { glyph: '@', tint: '#DCD7C9', ms: 8000, weight: 8 },
  glitch: { glyph: '#', tint: COLORS.dustyRose, ms: 0, weight: 4 },
  wingmen: { glyph: 'A', tint: COLORS.beige, ms: 8000, weight: 8 },
  big: { glyph: 'B', tint: COLORS.cream, ms: 8000, weight: 7 },
  chain: { glyph: '%', tint: '#C9C4B8', ms: 8000, weight: 7 },
}

export const dropChance = (wave: number) => Math.min(0.32, 0.15 + 0.016 * (wave - 1))

const PITY_KILLS = 12

export const pityKills = (wave: number) => Math.max(6, PITY_KILLS - Math.floor(wave / 2))

const SHIELD_FROM_WAVE = 2

export const pickPower = (random = Math.random, wave = SHIELD_FROM_WAVE) => {
  const pool = POWER_TYPES.filter((type) => type !== 'shield' || wave >= SHIELD_FROM_WAVE)
  const total = pool.reduce((sum, type) => sum + POWERS[type].weight, 0)
  let roll = random() * total
  for (const type of pool) {
    roll -= POWERS[type].weight
    if (roll < 0) return type
  }
  return pool[pool.length - 1]
}

export const TIMED_SLOTS = 2
