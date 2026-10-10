import { describe, expect, it } from 'vitest'
import { BAR_MS, BEAT_MS, BPM, CHORDS, MELODY, RISE_MS, kicksForBar, nextEnd, notesForBar } from './creditsTune'

describe('credits roll kick schedule', () => {
  it('lands kicks on beats 0, 1.5 and 3 with the rocket launched a rise earlier', () => {
    const origin = 1000
    const kicks = kicksForBar(0, origin)
    expect(BEAT_MS).toBeCloseTo(60000 / 126)
    expect(kicks.map((k) => k.beat)).toEqual([0, 1.5, 3])
    kicks.forEach((k) => {
      expect(k.at).toBeCloseTo(origin + k.beat * BEAT_MS)
      expect(k.launch).toBeCloseTo(k.at - RISE_MS)
      expect(k.whistle).toBe(true)
    })
  })

  it('adds 3.33 and 3.66 fills on phrase-end bars, with the sprite on the last hit', () => {
    for (const bar of [3, 7, 11, 15, 19]) {
      const kicks = kicksForBar(bar, 0)
      expect(kicks.map((k) => k.beat)).toEqual([0, 1.5, 3, 3.33, 3.66])
      expect(kicks[4].at).toBeCloseTo((bar * 4 + 3.66) * BEAT_MS)
      expect(kicks.slice(3).every((k) => k.fill && !k.whistle && k.level === 0.8)).toBe(true)
      expect(kicks[4].kind).toBe('sprite')
    }
    expect(kicksForBar(2, 0)).toHaveLength(3)
  })

  it('puts 8 sprites in each loop so the 15-strong cast all appears within two loops', () => {
    const sprites = Array.from({ length: 16 }, (_, bar) => kicksForBar(bar, 0)).flat().filter((k) => k.kind === 'sprite')
    expect(sprites).toHaveLength(8)
  })

  it('loops seamlessly: bar 16 starts exactly where bar 15 ends', () => {
    expect(kicksForBar(16, 0)[0].at).toBeCloseTo(16 * BAR_MS)
    expect(notesForBar(16)).toEqual(notesForBar(0))
  })

  it('ends the finale on a big shell at the next phrase end', () => {
    expect(nextEnd(4)).toBe(7)
    expect(nextEnd(7)).toBe(7)
    expect(nextEnd(16)).toBe(19)
    const last = kicksForBar(7, 0, true)
    expect(last.at(-1)?.kind).toBe('big')
    expect(last.some((k) => k.kind === 'sprite')).toBe(false)
  })

  it('keeps the score intact: 16 bars of 4/4 at 126 BPM', () => {
    expect(BPM).toBe(126)
    expect(CHORDS).toHaveLength(16)
    for (let bar = 0; bar < 16; bar++) expect(notesForBar(bar).reduce((s, n) => s + n.len, 0)).toBeLessThanOrEqual(4)
    expect(MELODY[0]).toEqual({ beat: 0, midi: 81, len: 0.5 })
  })
})
