const MUTED_KEY = 'cd-sound-muted'

// Sound is on by default; the only thing a visitor can change, and the only thing remembered, is mute.
export const readMuted = () => {
  try {
    return window.localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

export const writeMuted = (muted: boolean) => {
  try {
    if (muted) window.localStorage.setItem(MUTED_KEY, '1')
    else window.localStorage.removeItem(MUTED_KEY)
  } catch {
    return
  }
}
