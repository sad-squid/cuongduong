import { describe, expect, it } from 'vitest'
import { HIGH_SCORE_KEY, cleanInitials, insertScore, loadScores, qualifies, saveScores, type HighScore, type ScoreStorage } from './HighScores'

const memory = (): ScoreStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) }
}

const broken: ScoreStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

const entry = (initials: string, score: number): HighScore => ({ initials, score, wave: 1 })

const full = [entry('AAA', 900), entry('BBB', 700), entry('CCC', 500), entry('DDD', 300), entry('EEE', 100)]

describe('high scores', () => {
  it('qualifies any positive score while the table has room', () => {
    expect(qualifies([], 10)).toBe(true)
    expect(qualifies([], 0)).toBe(false)
    expect(qualifies(full.slice(0, 4), 1)).toBe(true)
  })

  it('qualifies only scores that beat fifth place once full', () => {
    expect(qualifies(full, 100)).toBe(false)
    expect(qualifies(full, 99)).toBe(false)
    expect(qualifies(full, 101)).toBe(true)
  })

  it('inserts in rank order and keeps the top 5', () => {
    const { list, rank } = insertScore(full, entry('new', 600))
    expect(rank).toBe(2)
    expect(list).toHaveLength(5)
    expect(list.map((e) => e.initials)).toEqual(['AAA', 'BBB', 'NEW', 'CCC', 'DDD'])
  })

  it('puts a tie below the existing entry and reports a miss as -1', () => {
    expect(insertScore(full.slice(0, 3), entry('ZZZ', 700)).rank).toBe(2)
    expect(insertScore(full, entry('ZZZ', 50)).rank).toBe(-1)
  })

  it('round-trips through storage', () => {
    const store = memory()
    expect(saveScores(full, store)).toBe(true)
    expect(loadScores(store)).toEqual(full)
  })

  it('cleans initials to three letters', () => {
    expect(cleanInitials('a1')).toBe('AAA')
    expect(cleanInitials('xyzw')).toBe('XYZ')
  })

  it('survives storage that throws or is missing', () => {
    expect(loadScores(broken)).toEqual([])
    expect(saveScores(full, broken)).toBe(false)
    expect(loadScores(null)).toEqual([])
    expect(saveScores(full, null)).toBe(false)
  })

  it('ignores corrupt or hostile data', () => {
    const store = memory()
    store.data.set(HIGH_SCORE_KEY, '{nope')
    expect(loadScores(store)).toEqual([])
    store.data.set(HIGH_SCORE_KEY, JSON.stringify([entry('OK', 5), { initials: 3, score: 'x' }, null, entry('<b>', 9)]))
    expect(loadScores(store)).toEqual([entry('BAA', 9), entry('OKA', 5)])
  })
})
