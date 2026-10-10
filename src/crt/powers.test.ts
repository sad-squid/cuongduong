import { describe, expect, it } from 'vitest'
import { POWER_TYPES, dropChance, pickPower, pityKills } from './powers'

const sequence = (steps: number) => {
  let i = 0
  return () => (i++ % steps) / steps
}

describe('powers', () => {
  it('can roll every type from wave 2', () => {
    const roll = sequence(500)
    const all = new Set(Array.from({ length: 500 }, () => pickPower(roll, 2)))
    expect(all.size).toBe(POWER_TYPES.length)
  })

  it('never rolls a shield in wave 1', () => {
    const roll = sequence(500)
    const all = new Set(Array.from({ length: 500 }, () => pickPower(roll, 1)))
    expect(all.has('shield')).toBe(false)
    expect(all.size).toBe(POWER_TYPES.length - 1)
  })

  it('drops more often in later waves, capped', () => {
    expect(dropChance(1)).toBeCloseTo(0.15)
    expect(dropChance(8)).toBeGreaterThan(dropChance(1))
    expect(dropChance(40)).toBe(0.32)
    expect(pityKills(12)).toBeLessThan(pityKills(1))
  })
})
