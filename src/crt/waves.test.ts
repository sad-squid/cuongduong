import { describe, expect, it } from 'vitest'
import { BULLET_ART, FOE_ART } from './foeArt'
import { bulletCap, enrageCap, patternsFor, planWave, shieldHits } from './waves'

describe('waves', () => {
  it('varies the formation across the first ten waves with a boss every fifth', () => {
    const plans = Array.from({ length: 10 }, (_, i) => planWave(i + 1))
    expect(new Set(plans.map((p) => p.formation)).size).toBeGreaterThanOrEqual(8)
    expect(plans[4].formation).toBe('boss')
    expect(plans[9].formation).toBe('boss')
    expect(plans[9].boss).not.toBe(plans[4].boss)
    expect(planWave(3)).toMatchObject({ formation: 'swarm', count: 60 })
  })

  it('keeps the first two waves gentle and escalates to chaos', () => {
    expect(patternsFor(1)).toEqual(['drop'])
    expect(patternsFor(8)).toContain('spiral')
    expect(bulletCap(2)).toBeLessThan(10)
    expect(bulletCap(8)).toBeGreaterThan(200)
  })

  it('makes shields and enrage scale with the wave', () => {
    expect(shieldHits(2)).toBe(1)
    expect(shieldHits(9)).toBeGreaterThan(shieldHits(3))
    expect(shieldHits(99)).toBe(6)
    expect(enrageCap(1)).toBe(1)
    expect(enrageCap(12)).toBeGreaterThan(enrageCap(5))
  })

  it('has rectangular sprite grids with valid palette letters', () => {
    for (const sprite of Object.values(FOE_ART)) {
      const width = sprite.grid[0].length
      for (const row of sprite.grid) {
        expect(row.length, sprite.name).toBe(width)
        for (const ch of row) if (ch !== '.') expect('ABCDEFGHIJKLMNOP'.indexOf(ch), sprite.name).toBeLessThan(sprite.palette.length)
      }
    }
    for (const art of Object.values(BULLET_ART)) for (const row of art) expect(row).toHaveLength(5)
  })
})
