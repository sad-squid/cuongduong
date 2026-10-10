export const COLORS = {
  bg: '#1A1A1B',
  cream: '#F0EEE9',
  beige: '#DCD7C9',
  coral: '#FF5533',
  teal: '#3BB8D0',
  warmCoral: '#F06E61',
  dustyRose: '#B58484',
  roseText: '#BA7F8A',
} as const

export const PHYSICS = { radius: 64, force: 2.6, spring: 0.075, damp: 0.8 } as const

export const BLAST = { radius: 240, strength: 16, sparks: 60 } as const

export const NAME_FONT_STACK = '"Space Grotesk", "Name JP", "DM Sans", system-ui, sans-serif'

export const DOT = 1.6

export type Tear = {
  bands: { y0: number; y1: number; amp: number; dx: number }[]
  until: number
  nextJitter: number
}

export const jitterTear = (tear: Tear, now: number) => {
  if (now < tear.nextJitter) return
  tear.nextJitter = now + 45
  for (const band of tear.bands) band.dx = (Math.random() * 2 - 1) * band.amp
}

export const gaussianStream = (seed: number) => {
  let a = seed >>> 0
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return () => {
    let x = 0
    let y = 0
    while (!x) x = uniform()
    while (!y) y = uniform()
    return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y)
  }
}

export const contrastRatio = (fg: string, bg: string) => {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
