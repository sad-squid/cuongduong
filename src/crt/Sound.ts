export type SoundName =
  | 'blast'
  | 'tear'
  | 'generate'
  | 'tick'
  | 'flight'
  | 'lang'
  | 'rocket'
  | 'burst'
  | 'sprite'
  | 'hover'
  | 'toggle'

export type Variant = 'A' | 'B' | 'C'

export type PlayOptions = {
  intensity?: number
  pan?: number
  variant?: Variant
  duration?: number
}

export type ChainSettings = {
  volume: number
  bits: number
  rate: number
  tone: number
}

export type SoundApi = {
  readonly enabled: boolean
  readonly muted: boolean
  readonly room: boolean
  readonly state: AudioContextState | 'none'
  readonly variants: Readonly<Record<SoundName, Variant>>
  readonly roomVariant: Variant
  readonly settings: Readonly<ChainSettings>
  setEnabled(on: boolean): void
  setMuted(muted: boolean): void
  setRoom(on: boolean, variant?: Variant): void
  play(name: SoundName, opts?: PlayOptions): void
  setVariant(name: SoundName, variant: Variant): void
  setSettings(next: Partial<ChainSettings>): void
}

export const SOUND_NAMES: readonly SoundName[] = [
  'blast',
  'tear',
  'generate',
  'tick',
  'flight',
  'lang',
  'rocket',
  'burst',
  'sprite',
  'hover',
  'toggle',
]

export const DEFAULT_SETTINGS: ChainSettings = { volume: 0.3, bits: 10, rate: 18000, tone: 2800 }

export const DEFAULT_VARIANTS: Record<SoundName, Variant> = {
  blast: 'A',
  tear: 'A',
  generate: 'A',
  tick: 'A',
  flight: 'A',
  lang: 'A',
  rocket: 'A',
  burst: 'A',
  sprite: 'A',
  hover: 'A',
  toggle: 'A',
}

export const DEFAULT_ROOM_VARIANT: Variant = 'A'

type Limit = { max: number; gap: number; steal: boolean }

const LIMITS: Record<SoundName, Limit> = {
  blast: { max: 3, gap: 0.06, steal: true },
  tear: { max: 2, gap: 0.08, steal: true },
  generate: { max: 1, gap: 0.1, steal: true },
  tick: { max: 3, gap: 0.03, steal: false },
  flight: { max: 1, gap: 0.1, steal: true },
  lang: { max: 1, gap: 0.1, steal: true },
  rocket: { max: 3, gap: 0.08, steal: true },
  burst: { max: 4, gap: 0.05, steal: true },
  sprite: { max: 2, gap: 0.1, steal: true },
  hover: { max: 1, gap: 0.08, steal: false },
  toggle: { max: 1, gap: 0.1, steal: true },
}

const MAX_VOICES = 14

const LEVEL_SPREAD = 0.1

const PITCH_SPREAD: Record<SoundName, number> = {
  blast: 0.03,
  tear: 0.03,
  generate: 0.03,
  tick: 0.03,
  flight: 0.03,
  lang: 0.03,
  rocket: 0.03,
  burst: 0.03,
  sprite: 0.03,
  hover: 0.03,
  toggle: 0.03,
}

const TRIM: Record<SoundName, Record<Variant, number>> = {
  blast: { A: 0.85, B: 0.75, C: 2.4 },
  tear: { A: 1.25, B: 2, C: 1.15 },
  generate: { A: 0.6, B: 0.57, C: 0.62 },
  tick: { A: 1.8, B: 2, C: 0.7 },
  flight: { A: 0.85, B: 0.5, C: 0.75 },
  lang: { A: 2.7, B: 1.45, C: 3.5 },
  rocket: { A: 0.95, B: 0.55, C: 1.15 },
  burst: { A: 0.62, B: 0.57, C: 0.73 },
  sprite: { A: 0.57, B: 0.6, C: 0.72 },
  hover: { A: 1.5, B: 2, C: 0.7 },
  toggle: { A: 1.9, B: 2, C: 2 },
}

type Shape = 'sine' | 'triangle' | 'square' | 'p12' | 'p25'
type NoiseKind = 'white' | 'pink' | 'brown' | 'crackle' | 'vinyl' | 'grit'
type Point = readonly [number, number]

type Kit = {
  ctx: BaseAudioContext
  out: AudioNode
  k: number
  dur: number
  osc(shape: Shape, freq: number, t: number, end: number): OscillatorNode
  env(dest: AudioNode, t: number, peak: number, attack: number, release: number): GainNode
  curve(dest: AudioNode, t: number, points: readonly Point[]): GainNode
  noise(kind: NoiseKind, t: number, end: number, rate?: number): AudioBufferSourceNode
  filt(type: BiquadFilterType, freq: number, q: number): BiquadFilterNode
  flutter(param: AudioParam, t: number, end: number, hz: number, depth: number): void
  wobble(dest: AudioNode, t: number, end: number, hz: number, depth: number): GainNode
  tail(dest: AudioNode, time: number, feedback: number, wet: number): AudioNode
}

type SoundFn = (kit: Kit, t: number) => number

const rand = (a: number, b: number): number => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))

const sweep = (p: AudioParam, t: number, points: readonly Point[]): void => {
  for (const [at, v] of points) p.exponentialRampToValueAtTime(v, t + at)
}

const tup = (kit: Kit, shape: Shape, from: number, to: number, t: number, peak: number, release: number, lp = 1200, attack = 0.003): void => {
  const o = kit.osc(shape, from, t, t + attack + release * 1.7 + 0.01)
  o.frequency.exponentialRampToValueAtTime(to, t + attack + release * 0.6)
  o.connect(kit.filt('lowpass', lp, 0.5)).connect(kit.env(kit.out, t, peak, attack, release))
}

const fz = (kit: Kit, kind: NoiseKind, t: number, peak: number, release: number, type: BiquadFilterType, f: number, q: number, attack = 0.003): BiquadFilterNode => {
  const flt = kit.filt(type, f, q)
  kit.noise(kind, t, t + attack + release * 1.7 + 0.01).connect(flt).connect(kit.env(kit.out, t, peak, attack, release))
  return flt
}

const hit = (kit: Kit, t: number, peak: number, f = 2600, click = 0): void => {
  fz(kit, 'white', t, peak, 0.005, 'bandpass', f, 0.9)
  if (click > 0) {
    const o = kit.osc('p25', 1100, t, t + 0.012)
    o.connect(kit.filt('lowpass', 3000, 0.5)).connect(kit.env(kit.out, t, click, 0.002, 0.004))
  }
}

const tok = (kit: Kit, t: number, f: number, peak: number, release = 0.03): void => {
  fz(kit, 'white', t, peak * 2.2, release * 0.7, 'bandpass', f, 6, 0.002)
  tup(kit, 'triangle', f * 1.1, f * 0.8, t, peak * 0.6, release, 1000, 0.002)
}

const debris = (kit: Kit, t: number, peak: number, release: number, lp: number): void => {
  const g = kit.env(kit.out, t, peak, 0.004, release)
  kit.noise('white', t, t + release * 1.7 + 0.02).connect(kit.filt('lowpass', lp, 0.6)).connect(kit.wobble(g, t, t + release * 1.7 + 0.02, 55, 0.85))
}

const boom = (kit: Kit, t: number, from: number, to: number, peak: number, release: number): void => {
  const o = kit.osc('sine', from, t, t + release * 1.7 + 0.03)
  o.frequency.exponentialRampToValueAtTime(to, t + release)
  o.connect(kit.env(kit.out, t, peak, 0.012, release))
}

const grit = (kit: Kit, t: number, peak: number, release: number, lp: number, dest?: AudioNode): void => {
  const g = kit.env(dest ?? kit.out, t, peak, 0.015, release)
  kit.noise('grit', t, t + release * 1.7 + 0.03).connect(kit.filt('lowpass', lp, 0.5)).connect(g)
}

const settle = (kit: Kit, t: number, d: number, bed: number, grain: number, lp: number, pinkMix: number): void => {
  const end = t + d * 0.82
  const f = kit.filt('lowpass', lp, 0.5)
  sweep(f.frequency, t, [[d * 0.8, lp * 0.5]])
  const g = kit.curve(kit.out, t, [[0, 0], [0.025, bed], [d * 0.3, bed * 0.8], [d * 0.8, 0]])
  f.connect(g)
  const pg = kit.ctx.createGain()
  pg.gain.value = pinkMix
  kit.noise('pink', t, end).connect(pg).connect(f)
  const wg = kit.ctx.createGain()
  wg.gain.value = 1 - pinkMix
  kit.noise('white', t, end).connect(wg).connect(f)
  const gf = kit.filt('lowpass', 2000, 0.5)
  kit.noise('grit', t, end).connect(gf).connect(kit.curve(kit.out, t, [[0, 0], [0.02, grain], [d * 0.45, grain * 0.6], [d * 0.78, 0]]))
}

const landing = (kit: Kit, at: number): void => {
  tok(kit, at, 240, 0.2, 0.05)
  tup(kit, 'triangle', 140, 70, at, 0.32, 0.08, 600, 0.006)
}

const SOUNDS: Record<SoundName, Record<Variant, SoundFn>> = {
  blast: {
    A: (kit, t) => {
      hit(kit, t, 0.32, 2600, 0.1)
      tup(kit, 'triangle', 120 + 15 * kit.k, 55, t, 0.6, 0.09, 700)
      tok(kit, t, 340, 0.14, 0.03)
      debris(kit, t + 0.008, 0.3, 0.06, 1500)
      return 0.17
    },
    B: (kit, t) => {
      hit(kit, t, 0.28, 2400, 0.08)
      tup(kit, 'sine', 100, 48, t, 0.65, 0.1, 600)
      fz(kit, 'brown', t + 0.005, 0.6, 0.08, 'lowpass', 1200, 0.6)
      return 0.18
    },
    C: (kit, t) => {
      hit(kit, t, 0.3, 2200)
      tok(kit, t, 260, 0.2, 0.04)
      debris(kit, t, 0.36, 0.09, 1800)
      return 0.17
    },
  },
  tear: {
    A: (kit, t) => {
      hit(kit, t, 0.16, 2400)
      const o = kit.osc('square', 140, t, t + 0.12)
      kit.flutter(o.frequency, t, t + 0.12, 35, 16)
      o.connect(kit.filt('lowpass', 900, 1)).connect(kit.env(kit.out, t, 0.32, 0.004, 0.06))
      fz(kit, 'white', t, 0.12, 0.04, 'lowpass', 1500, 0.6)
      return 0.11
    },
    B: (kit, t) => {
      const o = kit.osc('p25', 200, t, t + 0.13)
      const g = kit.env(kit.out, t, 0.3, 0.004, 0.07)
      o.connect(kit.filt('lowpass', 1100, 0.8)).connect(kit.wobble(g, t, t + 0.13, 50, 0.8))
      return 0.12
    },
    C: (kit, t) => {
      kit.osc('square', 120, t, t + 0.13).connect(kit.filt('lowpass', 700, 0.8)).connect(kit.env(kit.out, t, 0.32, 0.004, 0.07))
      fz(kit, 'brown', t, 0.4, 0.07, 'lowpass', 1500, 0.6)
      return 0.13
    },
  },
  generate: {
    A: (kit, t) => {
      const d = kit.dur
      settle(kit, t, d, 0.3, 0.26, 1900, 0.5)
      landing(kit, t + d * 0.78)
      return d * 0.78 + 0.15
    },
    B: (kit, t) => {
      const d = kit.dur
      settle(kit, t, d, 0.22, 0.45, 1800, 0.5)
      landing(kit, t + d * 0.78)
      return d * 0.78 + 0.15
    },
    C: (kit, t) => {
      const d = kit.dur
      settle(kit, t, d, 0.38, 0.14, 2200, 0.25)
      landing(kit, t + d * 0.78)
      return d * 0.78 + 0.15
    },
  },
  tick: {
    A: (kit, t) => {
      tok(kit, t, 420, 0.08, 0.02)
      return 0.04
    },
    B: (kit, t) => {
      fz(kit, 'white', t, 0.12, 0.012, 'lowpass', 1200, 0.6)
      return 0.025
    },
    C: (kit, t) => {
      tup(kit, 'triangle', 300, 200, t, 0.14, 0.02, 900)
      return 0.04
    },
  },
  flight: {
    A: (kit, t) => {
      const d = kit.dur
      const lp = kit.filt('lowpass', 300, 0.8)
      sweep(lp.frequency, t, [[d * 0.45, 1200], [d, 500]])
      kit.noise('white', t, t + d + 0.02).connect(lp).connect(kit.curve(kit.out, t, [[0, 0], [d * 0.4, 0.5], [d, 0]]))
      return d
    },
    B: (kit, t) => {
      const d = kit.dur
      const lp = kit.filt('lowpass', 400, 0.8)
      sweep(lp.frequency, t, [[d * 0.45, 1500], [d, 600]])
      kit.noise('brown', t, t + d + 0.02).connect(lp).connect(kit.curve(kit.out, t, [[0, 0], [d * 0.4, 0.7], [d, 0]]))
      return d
    },
    C: (kit, t) => {
      const d = kit.dur
      const bp = kit.filt('bandpass', 400, 0.7)
      sweep(bp.frequency, t, [[d * 0.45, 1000], [d, 500]])
      const g = kit.curve(kit.out, t, [[0, 0], [d * 0.4, 0.55], [d, 0]])
      kit.noise('white', t, t + d + 0.02).connect(bp).connect(kit.wobble(g, t, t + d + 0.02, 14, 0.3))
      return d
    },
  },
  lang: {
    A: (kit, t) => {
      hit(kit, t, 0.2, 2600, 0.1)
      tok(kit, t, 380, 0.22, 0.035)
      return 0.08
    },
    B: (kit, t) => {
      hit(kit, t, 0.2, 2400)
      tup(kit, 'triangle', 500, 380, t, 0.3, 0.04, 1000)
      return 0.08
    },
    C: (kit, t) => {
      tok(kit, t, 330, 0.24, 0.04)
      fz(kit, 'white', t + 0.02, 0.1, 0.03, 'lowpass', 1500, 0.6)
      return 0.09
    },
  },
  rocket: {
    A: (kit, t) => {
      const d = kit.dur
      fz(kit, 'brown', t, 0.6, 0.12, 'lowpass', 400, 0.6, 0.01)
      boom(kit, t, 90, 60, 0.35, 0.1)
      const lp = kit.filt('lowpass', 250, 0.7)
      sweep(lp.frequency, t, [[d, 900]])
      kit.noise('white', t, t + d + 0.02).connect(lp).connect(kit.curve(kit.out, t, [[0, 0], [0.04, 0.2], [d * 0.6, 0.35], [d, 0]]))
      return d
    },
    B: (kit, t) => {
      const d = kit.dur
      const lp = kit.filt('lowpass', 300, 0.7)
      sweep(lp.frequency, t, [[d, 900]])
      kit.noise('brown', t, t + d + 0.02).connect(lp).connect(kit.curve(kit.out, t, [[0, 0], [0.02, 0.6], [d * 0.6, 0.5], [d, 0]]))
      return d
    },
    C: (kit, t) => {
      const d = kit.dur
      boom(kit, t, 80, 55, 0.4, 0.09)
      const bp = kit.filt('bandpass', 300, 1)
      sweep(bp.frequency, t, [[d, 800]])
      kit.noise('white', t, t + d + 0.02).connect(bp).connect(kit.curve(kit.out, t, [[0, 0], [0.04, 0.3], [d * 0.6, 0.5], [d, 0]]))
      return d
    },
  },
  burst: {
    A: (kit, t) => {
      boom(kit, t, 70, 40, 0.6 * (0.6 + 0.4 * kit.k), 0.2)
      tup(kit, 'triangle', 130, 60, t, 0.16, 0.12, 400, 0.01)
      grit(kit, t + 0.06, 0.55, 0.2, 1800)
      return 0.45
    },
    B: (kit, t) => {
      boom(kit, t, 60, 38, 0.6, 0.22)
      fz(kit, 'brown', t, 0.45, 0.16, 'lowpass', 300, 0.6, 0.012)
      grit(kit, t + 0.07, 0.55, 0.2, 1400)
      return 0.46
    },
    C: (kit, t) => {
      const room = kit.tail(kit.out, 0.1, 0.2, 0.4)
      boom(kit, t, 70, 40, 0.55, 0.18)
      grit(kit, t + 0.06, 0.5, 0.16, 1600, room)
      return 0.5
    },
  },
  sprite: {
    A: (kit, t) => {
      boom(kit, t, 75, 40, 0.6, 0.22)
      tup(kit, 'triangle', 150, 70, t, 0.2, 0.14, 450, 0.01)
      grit(kit, t + 0.05, 0.5, 0.18, 1800)
      grit(kit, t + 0.16, 0.3, 0.18, 900)
      return 0.5
    },
    B: (kit, t) => {
      boom(kit, t, 65, 38, 0.6, 0.22)
      fz(kit, 'brown', t, 0.5, 0.18, 'lowpass', 350, 0.6, 0.012)
      grit(kit, t + 0.06, 0.5, 0.18, 1500)
      grit(kit, t + 0.15, 0.3, 0.16, 1000)
      return 0.5
    },
    C: (kit, t) => {
      const room = kit.tail(kit.out, 0.1, 0.2, 0.4)
      boom(kit, t, 75, 40, 0.55, 0.2)
      grit(kit, t + 0.05, 0.45, 0.16, 1700, room)
      grit(kit, t + 0.14, 0.28, 0.14, 1000, room)
      return 0.5
    },
  },
  hover: {
    A: (kit, t) => {
      tok(kit, t, 400, 0.035, 0.02)
      return 0.04
    },
    B: (kit, t) => {
      fz(kit, 'white', t, 0.06, 0.008, 'lowpass', 1000, 0.6)
      return 0.02
    },
    C: (kit, t) => {
      tup(kit, 'triangle', 250, 200, t, 0.06, 0.015, 800)
      return 0.03
    },
  },
  toggle: {
    A: (kit, t) => {
      tok(kit, t, 360, 0.22, 0.03)
      tok(kit, t + 0.075, 300, 0.2, 0.035)
      return 0.14
    },
    B: (kit, t) => {
      tok(kit, t, 300, 0.2, 0.03)
      tok(kit, t + 0.075, 400, 0.2, 0.035)
      return 0.14
    },
    C: (kit, t) => {
      hit(kit, t, 0.2, 2400)
      tok(kit, t, 320, 0.2, 0.03)
      tok(kit, t + 0.08, 280, 0.18, 0.035)
      return 0.15
    },
  },
}

const DEFAULT_DURATIONS: Partial<Record<SoundName, number>> = {
  generate: 0.9,
  flight: 0.3,
  rocket: 0.6,
}

const WORKLET_SRC = `
class CrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bits', defaultValue: 10, minValue: 1, maxValue: 16, automationRate: 'k-rate' },
      { name: 'rate', defaultValue: 18000, minValue: 500, maxValue: 96000, automationRate: 'k-rate' },
    ]
  }
  constructor() { super(); this.ph = [0, 0]; this.v = [0, 0] }
  process(inputs, outputs, params) {
    const input = inputs[0]
    const output = outputs[0]
    const steps = Math.pow(2, params.bits[0] - 1)
    const hold = Math.max(1, sampleRate / params.rate[0])
    for (let ch = 0; ch < output.length; ch += 1) {
      const src = input && input[ch]
      const dst = output[ch]
      if (!src) { dst.fill(0); continue }
      let ph = this.ph[ch] || 0
      let v = this.v[ch] || 0
      for (let i = 0; i < dst.length; i += 1) {
        ph -= 1
        if (ph <= 0) { v = Math.round(src[i] * steps) / steps; ph += hold }
        dst[i] = v
      }
      this.ph[ch] = ph
      this.v[ch] = v
    }
    return true
  }
}
registerProcessor('crt-crush', CrushProcessor)
`

let workletUrl: string | null = null
const getWorkletUrl = (): string => {
  if (workletUrl === null) workletUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }))
  return workletUrl
}

const crushCurve = (bits: number): Float32Array<ArrayBuffer> => {
  const n = 8192
  const steps = Math.pow(2, bits - 1)
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = Math.round(x * steps) / steps
  }
  return curve
}

type Buffers = Record<NoiseKind, AudioBuffer>

const makeBuffers = (ctx: BaseAudioContext): Buffers => {
  const len = ctx.sampleRate * 2
  const make = (fill: (d: Float32Array) => void): AudioBuffer => {
    const b = ctx.createBuffer(1, len, ctx.sampleRate)
    fill(b.getChannelData(0))
    return b
  }
  const normalize = (d: Float32Array, target: number): void => {
    let peak = 0
    for (let i = 0; i < d.length; i += 1) peak = Math.max(peak, Math.abs(d[i] ?? 0))
    const k = peak > 0 ? target / peak : 1
    for (let i = 0; i < d.length; i += 1) d[i] = (d[i] ?? 0) * k
  }
  const white = make((d) => {
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1
  })
  const pink = make((d) => {
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < d.length; i += 1) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
      b6 = w * 0.115926
    }
    normalize(d, 0.9)
  })
  const brown = make((d) => {
    let last = 0
    for (let i = 0; i < d.length; i += 1) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      d[i] = last
    }
    normalize(d, 0.9)
  })
  const impulses = (density: number) => (d: Float32Array): void => {
    for (let i = 0; i < d.length - 24; i += 1) {
      if (Math.random() < density) {
        const a = (Math.random() < 0.5 ? -1 : 1) * Math.pow(Math.random(), 1.5)
        const len = 6 + Math.floor(Math.random() * 16)
        for (let j = 0; j < len; j += 1) d[i + j] = (d[i + j] ?? 0) + a * Math.exp(-j / (len / 3)) * Math.cos(j * 1.3)
      }
    }
    normalize(d, 0.9)
  }
  const crackle = make(impulses(0.004))
  const grit = make((d) => {
    for (let i = 0; i < d.length - 120; i += 1) {
      if (Math.random() < 0.0016) {
        const a = (Math.random() < 0.5 ? -1 : 1) * Math.pow(Math.random(), 1.3)
        const len = 30 + Math.floor(Math.random() * 70)
        const w = rand(0.08, 0.22)
        for (let j = 0; j < len; j += 1) d[i + j] = (d[i + j] ?? 0) + a * Math.exp(-j / (len / 3)) * Math.sin(j * w)
      }
    }
    normalize(d, 0.9)
  })
  const vinyl = make(impulses(0.0012))
  return { white, pink, brown, crackle, vinyl, grit }
}

const pulseWave = (ctx: BaseAudioContext, duty: number): PeriodicWave => {
  const n = 32
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  for (let h = 1; h < n; h += 1) {
    real[h] = Math.sin(2 * Math.PI * h * duty) / (h * Math.PI)
    imag[h] = (1 - Math.cos(2 * Math.PI * h * duty)) / (h * Math.PI)
  }
  return ctx.createPeriodicWave(real, imag)
}

type RoomHandle = { stop(at: number): void }

type Engine = {
  ctx: BaseAudioContext
  master: GainNode
  ready: Promise<void>
  apply(s: ChainSettings): void
  voice(name: SoundName, variant: Variant, t: number, opts: PlayOptions): { gain: GainNode; end: number }
  room(variant: Variant, t: number): RoomHandle
}

const createEngine = (ctx: BaseAudioContext, initial: ChainSettings): Engine => {
  const buffers = makeBuffers(ctx)
  const waves = { p12: pulseWave(ctx, 0.125), p25: pulseWave(ctx, 0.25) }
  const bus = ctx.createGain()
  const shaper = ctx.createWaveShaper()
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.Q.value = 0.4
  lowpass.frequency.value = initial.tone
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.knee.value = 10
  comp.ratio.value = 6
  comp.attack.value = 0.005
  comp.release.value = 0.2
  const master = ctx.createGain()
  bus.connect(shaper).connect(lowpass).connect(comp).connect(master).connect(ctx.destination)
  let crush: AudioWorkletNode | null = null
  let current = initial

  const apply = (s: ChainSettings): void => {
    current = s
    const now = ctx.currentTime
    lowpass.frequency.setTargetAtTime(s.tone, now, 0.02)
    shaper.curve = crushCurve(s.bits)
    if (crush !== null) {
      crush.parameters.get('bits')?.setValueAtTime(s.bits, now)
      crush.parameters.get('rate')?.setValueAtTime(s.rate, now)
    }
  }

  const ready =
    typeof AudioWorkletNode === 'undefined' || !('audioWorklet' in ctx)
      ? Promise.resolve()
      : ctx.audioWorklet
          .addModule(getWorkletUrl())
          .then(() => {
            const node = new AudioWorkletNode(ctx, 'crt-crush', { outputChannelCount: [2] })
            bus.disconnect()
            bus.connect(node).connect(lowpass)
            crush = node
            apply(current)
          })
          .catch(() => undefined)

  apply(initial)

  const osc = (shape: Shape, freq: number, t: number, end: number): OscillatorNode => {
    const o = ctx.createOscillator()
    if (shape === 'p12' || shape === 'p25') o.setPeriodicWave(waves[shape])
    else o.type = shape
    o.frequency.setValueAtTime(freq, t)
    o.start(t)
    o.stop(end)
    return o
  }

  const env = (dest: AudioNode, t: number, peak: number, attack: number, release: number): GainNode => {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    g.gain.setTargetAtTime(0, t + attack, release / 4)
    g.gain.setValueAtTime(0, t + attack + release * 1.6)
    g.connect(dest)
    return g
  }

  const curve = (dest: AudioNode, t: number, points: readonly Point[]): GainNode => {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    for (const [at, v] of points) g.gain.linearRampToValueAtTime(v, t + at)
    g.connect(dest)
    return g
  }

  const noise = (kind: NoiseKind, t: number, end: number, rate = 1): AudioBufferSourceNode => {
    const s = ctx.createBufferSource()
    s.buffer = buffers[kind]
    s.loop = true
    s.playbackRate.value = rate
    s.start(t, Math.random() * 1.8)
    s.stop(end)
    return s
  }

  const filt = (type: BiquadFilterType, freq: number, q: number): BiquadFilterNode => {
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    return f
  }

  const flutter = (param: AudioParam, t: number, end: number, hz: number, depth: number): void => {
    const lfo = osc('sine', hz, t, end)
    const g = ctx.createGain()
    g.gain.value = depth
    lfo.connect(g).connect(param)
  }

  const wobble = (dest: AudioNode, t: number, end: number, hz: number, depth: number): GainNode => {
    const g = ctx.createGain()
    g.gain.value = 1 - depth / 2
    flutter(g.gain, t, end, hz, depth / 2)
    g.connect(dest)
    return g
  }

  const tail = (dest: AudioNode, time: number, feedback: number, wet: number): AudioNode => {
    const input = ctx.createGain()
    const delay = ctx.createDelay(1)
    delay.delayTime.value = time
    const fb = ctx.createGain()
    fb.gain.value = feedback
    const damp = filt('lowpass', 1600, 0.4)
    const out = ctx.createGain()
    out.gain.value = wet
    input.connect(dest)
    input.connect(delay).connect(damp).connect(fb).connect(delay)
    damp.connect(out).connect(dest)
    return input
  }

  const voice = (name: SoundName, variant: Variant, t: number, opts: PlayOptions): { gain: GainNode; end: number } => {
    const k = clamp(opts.intensity ?? 1, 0, 1)
    const gain = ctx.createGain()
    const spread = PITCH_SPREAD[name]
    const cents = 1200 * Math.log2(1 + rand(-spread, spread))
    gain.gain.value = (0.45 + 0.55 * k) * TRIM[name][variant] * rand(1 - LEVEL_SPREAD, 1 + LEVEL_SPREAD)
    const pan = ctx.createStereoPanner()
    pan.pan.value = clamp(opts.pan ?? 0, -1, 1)
    gain.connect(pan).connect(bus)
    const vOsc = (shape: Shape, freq: number, at: number, end: number): OscillatorNode => {
      const o = osc(shape, freq, at, end)
      o.detune.value = cents
      return o
    }
    const vFilt = (type: BiquadFilterType, freq: number, q: number): BiquadFilterNode => {
      const f = filt(type, freq, q)
      f.detune.value = cents
      return f
    }
    const kit: Kit = { ctx, out: gain, k, dur: opts.duration ?? DEFAULT_DURATIONS[name] ?? 0.5, osc: vOsc, env, curve, noise, filt: vFilt, flutter, wobble, tail }
    const len = SOUNDS[name][variant](kit, t)
    return { gain, end: t + len }
  }

  const room = (variant: Variant, t: number): RoomHandle => {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.setTargetAtTime(1, t, 0.5)
    g.connect(bus)
    const sources: AudioScheduledSourceNode[] = []
    const loop = (kind: NoiseKind, chain: AudioNode, level: number): void => {
      const s = ctx.createBufferSource()
      s.buffer = buffers[kind]
      s.loop = true
      s.start(t, Math.random() * 1.8)
      const lg = ctx.createGain()
      lg.gain.value = level
      s.connect(chain)
      chain.connect(lg).connect(g)
      sources.push(s)
    }
    const hum = (f: number, level: number): void => {
      const o = ctx.createOscillator()
      o.frequency.value = f
      o.start(t)
      const lg = ctx.createGain()
      lg.gain.value = level
      o.connect(lg).connect(g)
      sources.push(o)
    }
    if (variant === 'A') {
      loop('pink', filt('lowpass', 2200, 0.4), 0.03)
    } else if (variant === 'B') {
      loop('pink', filt('bandpass', 1400, 0.4), 0.022)
      hum(60, 0.018)
      hum(120, 0.007)
    } else {
      loop('brown', filt('lowpass', 900, 0.4), 0.036)
      loop('vinyl', filt('bandpass', 2000, 0.5), 0.03)
    }
    return {
      stop: (at: number) => {
        g.gain.cancelScheduledValues(at)
        g.gain.setValueAtTime(g.gain.value, at)
        g.gain.setTargetAtTime(0, at, 0.25)
        for (const s of sources) s.stop(at + 1.5)
      },
    }
  }

  return { ctx, master, ready, apply, voice, room }
}

type Live = { name: SoundName; gain: GainNode; start: number; end: number }

export const createSound = (initial: Partial<ChainSettings> = {}): SoundApi => {
  let settings: ChainSettings = { ...DEFAULT_SETTINGS, ...initial }
  const variants: Record<SoundName, Variant> = { ...DEFAULT_VARIANTS }
  let roomVariant: Variant = DEFAULT_ROOM_VARIANT
  let roomOn = false
  let roomHandle: RoomHandle | null = null
  let engine: Engine | null = null
  let ctx: AudioContext | null = null
  let enabled = false
  let muted = false
  let live: Live[] = []
  const lastAt: Partial<Record<SoundName, number>> = {}

  const masterLevel = (): number => (enabled && !muted ? settings.volume : 0)

  const rampMaster = (): void => {
    if (engine === null) return
    engine.master.gain.setTargetAtTime(masterLevel(), engine.ctx.currentTime, 0.05)
  }

  const ensure = (): Engine | null => {
    if (engine !== null) return engine
    const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext
    if (Ctor === undefined) return null
    ctx = new Ctor({ latencyHint: 'interactive' })
    engine = createEngine(ctx, settings)
    engine.master.gain.value = 0
    return engine
  }

  const syncRoom = (): void => {
    const want = roomOn && enabled && engine !== null
    if (roomHandle !== null && engine !== null) {
      roomHandle.stop(engine.ctx.currentTime)
      roomHandle = null
    }
    if (want && engine !== null) roomHandle = engine.room(roomVariant, engine.ctx.currentTime + 0.01)
  }

  const release = (v: Live, now: number): void => {
    v.gain.gain.cancelScheduledValues(now)
    v.gain.gain.setValueAtTime(v.gain.gain.value, now)
    v.gain.gain.linearRampToValueAtTime(0, now + 0.03)
    v.end = now + 0.03
    window.setTimeout(() => v.gain.disconnect(), 80)
  }

  const play = (name: SoundName, opts: PlayOptions = {}): void => {
    if (!enabled || muted || engine === null || ctx === null) return
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const limit = LIMITS[name]
    const prev = lastAt[name]
    if (prev !== undefined && now - prev < limit.gap) return
    live = live.filter((v) => v.end > now)
    const same = live.filter((v) => v.name === name)
    if (same.length >= limit.max) {
      if (!limit.steal) return
      const oldest = same[0]
      if (oldest !== undefined) release(oldest, now)
    }
    if (live.length >= MAX_VOICES) {
      const oldest = live[0]
      if (oldest !== undefined) release(oldest, now)
    }
    lastAt[name] = now
    const t = now + 0.005
    const v = engine.voice(name, opts.variant ?? variants[name], t, opts)
    const entry: Live = { name, gain: v.gain, start: t, end: v.end }
    live.push(entry)
    window.setTimeout(() => entry.gain.disconnect(), (v.end - now) * 1000 + 400)
  }

  const setEnabled = (on: boolean): void => {
    if (on) {
      const e = ensure()
      if (e === null || ctx === null) return
      enabled = true
      if (ctx.state !== 'running') void ctx.resume()
      rampMaster()
      syncRoom()
      return
    }
    enabled = false
    rampMaster()
    syncRoom()
    const c = ctx
    if (c !== null) {
      window.setTimeout(() => {
        if (!enabled && c.state === 'running') void c.suspend()
      }, 400)
    }
  }

  return {
    get enabled() {
      return enabled
    },
    get muted() {
      return muted
    },
    get room() {
      return roomOn
    },
    get state() {
      return ctx === null ? 'none' : ctx.state
    },
    get variants() {
      return variants
    },
    get roomVariant() {
      return roomVariant
    },
    get settings() {
      return settings
    },
    setEnabled,
    setMuted: (m: boolean) => {
      muted = m
      rampMaster()
    },
    setRoom: (on: boolean, variant?: Variant) => {
      roomOn = on
      if (variant !== undefined) roomVariant = variant
      syncRoom()
    },
    play,
    setVariant: (name: SoundName, variant: Variant) => {
      variants[name] = variant
    },
    setSettings: (next: Partial<ChainSettings>) => {
      settings = { ...settings, ...next }
      if (engine !== null) {
        engine.apply(settings)
        rampMaster()
      }
    },
  }
}

export type Measurement = { peak: number; peakDb: number; duration: number; rendered: number; hf: number }

const analyse = (out: AudioBuffer, start: number, seconds: number): Measurement => {
  const chans = Array.from({ length: out.numberOfChannels }, (_, ch) => out.getChannelData(ch))
  let peak = 0
  for (const d of chans) for (let i = 0; i < d.length; i += 1) peak = Math.max(peak, Math.abs(d[i] ?? 0))
  const floor = peak * 0.001
  let last = 0
  for (const d of chans) for (let i = d.length - 1; i > last; i -= 1) if (Math.abs(d[i] ?? 0) > floor) last = i
  const w0 = (2 * Math.PI * 3000) / out.sampleRate
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2)
  const cw = Math.cos(w0)
  const a0 = 1 + alpha
  const b0 = (1 + cw) / 2 / a0
  const b1 = -(1 + cw) / a0
  const a1 = (-2 * cw) / a0
  const a2 = (1 - alpha) / a0
  let total = 0
  let high = 0
  for (const d of chans) {
    const st = [0, 0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < d.length; i += 1) {
      const x = d[i] ?? 0
      total += x * x
      let y = x
      for (let s = 0; s < 2; s += 1) {
        const o = s * 4
        const x1 = st[o] ?? 0
        const x2 = st[o + 1] ?? 0
        const y1 = st[o + 2] ?? 0
        const y2 = st[o + 3] ?? 0
        const out2 = b0 * y + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2
        st[o + 1] = x1
        st[o] = y
        st[o + 3] = y1
        st[o + 2] = out2
        y = out2
      }
      high += y * y
    }
  }
  return { peak, peakDb: 20 * Math.log10(Math.max(peak, 1e-9)), duration: Math.max(0, last / out.sampleRate - start), rendered: seconds, hf: total > 0 ? high / total : 0 }
}

export const measure = async (
  name: SoundName,
  variant: Variant,
  opts: PlayOptions = {},
  settings: ChainSettings = DEFAULT_SETTINGS,
  seconds = 3,
): Promise<Measurement> => {
  const sr = 48000
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr)
  const engine = createEngine(ctx, settings)
  await engine.ready
  engine.master.gain.value = settings.volume
  engine.voice(name, variant, 0.02, opts)
  return analyse(await ctx.startRendering(), 0.02, seconds)
}

export const measureRoom = async (variant: Variant, settings: ChainSettings = DEFAULT_SETTINGS, seconds = 4): Promise<Measurement> => {
  const sr = 48000
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr)
  const engine = createEngine(ctx, settings)
  await engine.ready
  engine.master.gain.value = settings.volume
  engine.room(variant, 0)
  return analyse(await ctx.startRendering(), 0, seconds)
}
