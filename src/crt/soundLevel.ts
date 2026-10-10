const LEVEL_KEY = 'cd-sound-level'
const MAX_VOLUME = 0.6

export const readLevel = () => {
  try {
    const raw = window.localStorage.getItem(LEVEL_KEY)
    const stored = Number(raw)
    return raw !== null && Number.isFinite(stored) && stored >= 0 && stored <= 100 ? stored : 50
  } catch {
    return 50
  }
}

export const writeLevel = (value: number) => {
  try {
    window.localStorage.setItem(LEVEL_KEY, String(value))
  } catch {
    return
  }
}

export const levelToVolume = (level: number) => (level / 100) * MAX_VOLUME

export type SoundPrefs = { sfx: boolean; music: boolean }
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
