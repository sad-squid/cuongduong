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
