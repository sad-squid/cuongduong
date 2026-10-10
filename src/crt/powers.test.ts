import { describe, expect, it } from 'vitest'
import { POWER_TYPES, dropChance, pickPower } from './powers'

const sequence = (steps: number) => {
  let i = 0
  return () => (i++ % steps) / steps
}

describe('powers', () => {
  it('can roll every type with a mouse, and never mirror on touch', () => {
    const roll = sequence(500)
    const all = new Set(Array.from({ length: 500 }, () => pickPower(false, roll)))
    const touchRoll = sequence(500)
    const touch = new Set(Array.from({ length: 500 }, () => pickPower(true, touchRoll)))
    expect(all.size).toBe(POWER_TYPES.length)
    expect(touch.has('mirror')).toBe(false)
    expect(touch.size).toBe(POWER_TYPES.length - 1)
  })

  it('drops a little more often in later waves, capped', () => {
    expect(dropChance(1)).toBeCloseTo(0.13)
    expect(dropChance(4)).toBeGreaterThan(dropChance(1))
    expect(dropChance(40)).toBe(0.2)
  })
})
