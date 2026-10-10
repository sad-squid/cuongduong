import { describe, expect, it } from 'vitest'
import { nearestStop, pageStops, scrollProgress, stepStop } from './section'

const ys = (stops: { y: number }[]) => stops.map((s) => s.y)

describe('pageStops', () => {
  it('gives one stop per viewport-sized section', () => {
    const stops = pageStops(
      [
        { top: 0, end: 0 },
        { top: 900, end: 900 },
        { top: 1800, end: 1800 },
      ],
      900,
    )
    expect(stops).toEqual([
      { y: 0, section: 0 },
      { y: 900, section: 1 },
      { y: 1800, section: 2 },
    ])
  })

  it('splits a tall section into even pages that overlap by at least 10%', () => {
    const stops = pageStops(
      [
        { top: 0, end: 0 },
        { top: 900, end: 2900 },
      ],
      900,
    )
    expect(ys(stops)).toEqual([0, 900, 1567, 2233, 2900])
    stops.slice(2).forEach((s, k) => expect(s.y - stops[k + 1].y).toBeLessThanOrEqual(810))
    expect(stops.map((s) => s.section)).toEqual([0, 1, 1, 1, 1])
  })

  it('ends a tall section with its bottom aligned to the viewport bottom', () => {
    const stops = pageStops([{ top: 0, end: 1000 }], 844)
    expect(stops[stops.length - 1].y).toBe(1000)
    expect(ys(stops)).toEqual([0, 500, 1000])
  })

  it('treats a span that fits in one step as two pages', () => {
    expect(ys(pageStops([{ top: 100, end: 700 }], 900))).toEqual([100, 700])
  })

  it('ignores sub-pixel overflow', () => {
    expect(ys(pageStops([{ top: 0, end: 1.5 }, { top: 901.5, end: 901.5 }], 900))).toEqual([0, 902])
  })

  it('never emits duplicate or descending stops', () => {
    const stops = pageStops(
      [
        { top: 0, end: 0 },
        { top: 0.4, end: 0.4 },
        { top: 600, end: 4000 },
      ],
      390,
    )
    const all = ys(stops)
    for (let k = 1; k < all.length; k++) expect(all[k]).toBeGreaterThan(all[k - 1])
  })
})

describe('stepStop', () => {
  const stops = pageStops(
    [
      { top: 0, end: 0 },
      { top: 900, end: 2900 },
      { top: 3800, end: 3800 },
    ],
    900,
  )

  it('moves exactly one stop from a stop', () => {
    expect(stepStop(stops, 900, 1)).toBe(2)
    expect(stepStop(stops, 900, -1)).toBe(0)
    expect(stepStop(stops, 2900, 1)).toBe(5)
    expect(stepStop(stops, 3800, -1)).toBe(4)
  })

  it('moves to the next stop in the direction when between stops', () => {
    expect(stepStop(stops, 1200, 1)).toBe(2)
    expect(stepStop(stops, 1200, -1)).toBe(1)
  })

  it('stops at the ends', () => {
    expect(stepStop(stops, 0, -1)).toBeNull()
    expect(stepStop(stops, 3800, 1)).toBeNull()
  })

  it('tolerates sub-pixel scroll positions', () => {
    expect(stepStop(stops, 899.5, 1)).toBe(2)
    expect(stepStop(stops, 900.5, -1)).toBe(0)
  })
})

describe('nearestStop', () => {
  const stops = pageStops([{ top: 0, end: 0 }, { top: 900, end: 900 }], 900)

  it('picks the closest stop', () => {
    expect(nearestStop(stops, 300)).toBe(0)
    expect(nearestStop(stops, 600)).toBe(1)
  })
})

describe('scrollProgress', () => {
  it('stays on a section while paging through it', () => {
    const regions = [
      { top: 0, end: 0 },
      { top: 900, end: 2900 },
      { top: 3800, end: 3800 },
    ]
    expect(scrollProgress(regions, 1567)).toBe(1)
    expect(scrollProgress(regions, 3350)).toBe(1.5)
  })
})
