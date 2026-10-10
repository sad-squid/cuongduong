import { describe, expect, it } from 'vitest'
import { POWER_TYPES, dropChance, pickPower } from './powers'

const sequence = (steps: number) => {
  let i = 0
  return () => (i++ % steps) / steps
}

describe('powers', () => {
  it('can roll every type', () => {
    const roll = sequence(500)
    const all = new Set(Array.from({ length: 500 }, () => pickPower(roll)))
    expect(all.size).toBe(POWER_TYPES.length)
  })

  it('drops a little more often in later waves, capped', () => {
    expect(dropChance(1)).toBeCloseTo(0.16)
    expect(dropChance(4)).toBeGreaterThan(dropChance(1))
    expect(dropChance(40)).toBe(0.24)
  })
})
