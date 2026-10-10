const LEVEL_KEY = 'cd-sound-level'
export const MAX_VOLUME = 0.6

export const readLevel = () => {
  try {
    const stored = Number(window.localStorage.getItem(LEVEL_KEY))
    return Number.isFinite(stored) && stored > 0 && stored <= 100 ? stored : 50
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
