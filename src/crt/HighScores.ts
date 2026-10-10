export type HighScore = { initials: string; score: number; wave: number }

export type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>

export const HIGH_SCORE_KEY = 'cuongduong:invaders:top5'

const TOP = 5

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const browserStorage = (): ScoreStorage | null => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const cleanInitials = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'A')

const valid = (entry: unknown): entry is HighScore => {
  if (!entry || typeof entry !== 'object') return false
  const { initials, score, wave } = entry as Record<string, unknown>
  return typeof initials === 'string' && typeof score === 'number' && Number.isFinite(score) && score >= 0 && typeof wave === 'number' && Number.isFinite(wave)
}

const rankScores = (list: HighScore[]) => [...list].sort((a, b) => b.score - a.score).slice(0, TOP)

export const loadScores = (storage: ScoreStorage | null = browserStorage()): HighScore[] => {
  try {
    const raw = storage?.getItem(HIGH_SCORE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return rankScores(parsed.filter(valid).map((entry) => ({ initials: cleanInitials(entry.initials), score: Math.floor(entry.score), wave: Math.floor(entry.wave) })))
  } catch {
    return []
  }
}

export const saveScores = (list: HighScore[], storage: ScoreStorage | null = browserStorage()) => {
  if (!storage) return false
  try {
    storage.setItem(HIGH_SCORE_KEY, JSON.stringify(rankScores(list)))
    return true
  } catch {
    return false
  }
}

export const qualifies = (list: HighScore[], score: number) => score > 0 && (list.length < TOP || score > list[Math.min(list.length, TOP) - 1].score)

export const insertScore = (list: HighScore[], entry: HighScore) => {
  const ranked = rankScores(list)
  let rank = ranked.findIndex((other) => entry.score > other.score)
  if (rank < 0) rank = ranked.length
  const next = [...ranked]
  next.splice(rank, 0, { ...entry, initials: cleanInitials(entry.initials) })
  return { list: next.slice(0, TOP), rank: rank < TOP ? rank : -1 }
}

export const bestScore = (list: HighScore[]) => list.reduce((best, entry) => Math.max(best, entry.score), 0)
