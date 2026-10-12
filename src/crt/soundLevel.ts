const LEVEL_KEY = 'cd-sound-level'
const LEVELS_KEY = 'cd-sound-levels'

// Master gain at full slider; each channel scales under it, so 50 on both matches the old single slider at 50.
export const MAX_VOLUME = 0.6

export type SoundLevels = { sfx: number; music: number }

const level = (value: unknown, fallback: number) => {
  const n = Number(value)
  return value !== null && value !== undefined && Number.isFinite(n) && n > 0 && n <= 100 ? n : fallback
}

export const readLevels = (): SoundLevels => {
  try {
    const legacy = level(window.localStorage.getItem(LEVEL_KEY), 50)
    const raw = JSON.parse(window.localStorage.getItem(LEVELS_KEY) ?? 'null') as Partial<SoundLevels> | null
    return { sfx: level(raw?.sfx, legacy), music: level(raw?.music, legacy) }
  } catch {
    return { sfx: 50, music: 50 }
  }
}

export const writeLevels = (levels: SoundLevels) => {
  try {
    window.localStorage.setItem(LEVELS_KEY, JSON.stringify(levels))
  } catch {
    return
  }
}

export const levelToGain = (value: number) => value / 100

type SoundPrefs = { sfx: boolean; music: boolean }
const PREFS_KEY = 'cd-sound-prefs'

export const readPrefs = (): SoundPrefs => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<SoundPrefs> | null
    return { sfx: raw?.sfx !== false, music: raw?.music !== false }
  } catch {
    return { sfx: true, music: true }
  }
}

export const writePrefs = (prefs: SoundPrefs) => {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    return
  }
}

const ASKED_KEY = 'cd-sound-asked'

export const readAsked = () => {
  try {
    return window.localStorage.getItem(ASKED_KEY) !== null
  } catch {
    return true
  }
}

export const writeAsked = () => {
  try {
    window.localStorage.setItem(ASKED_KEY, '1')
  } catch {
    return
  }
}
