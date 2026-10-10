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

export const DEFAULT_SETTINGS: ChainSettings = { volume: 0.3, bits: 10, rate: 20000, tone: 4800 }

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

const LEVEL_SPREAD = 0.12

const PITCH_SPREAD: Record<SoundName, number> = {
  blast: 0.07,
  tear: 0.06,
  generate: 0.04,
  tick: 0.08,
  flight: 0.06,
  lang: 0.04,
  rocket: 0.07,
  burst: 0.07,
  sprite: 0.06,
  hover: 0.06,
  toggle: 0.04,
}

const TRIM: Record<SoundName, Record<Variant, number>> = {
  blast: { A: 0.8, B: 1.3, C: 1.1 },
  tear: { A: 2.1, B: 1.9, C: 3 },
  generate: { A: 0.65, B: 0.95, C: 0.95 },
  tick: { A: 1.1, B: 1.3, C: 1.3 },
  flight: { A: 1.05, B: 1, C: 1 },
  lang: { A: 1.5, B: 1.1, C: 1.25 },
  rocket: { A: 1.15, B: 1, C: 1 },
  burst: { A: 0.88, B: 1.3, C: 1.2 },
  sprite: { A: 1, B: 1.5, C: 1.4 },
  hover: { A: 1, B: 1, C: 1 },
  toggle: { A: 1, B: 1.3, C: 1 },
}

type Shape = 'sine' | 'triangle' | 'square' | 'p12' | 'p25'
type NoiseKind = 'white' | 'pink' | 'brown' | 'crackle' | 'vinyl'
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

const pip = (kit: Kit, shape: Shape, f: number, t: number, peak: number, release: number, lp = 2600, to?: number): void => {
  const o = kit.osc(shape, f, t, t + release * 1.7 + 0.01)
  if (to !== undefined) o.frequency.exponentialRampToValueAtTime(to, t + Math.min(0.04, release))
  o.connect(kit.filt('lowpass', lp, 0.5)).connect(kit.env(kit.out, t, peak, 0.004, release))
}

const tup = (kit: Kit, shape: Shape, from: number, to: number, t: number, peak: number, release: number, lp = 2200): void => {
  const o = kit.osc(shape, from, t, t + release * 1.7 + 0.01)
  o.frequency.exponentialRampToValueAtTime(to, t + release * 0.6)
  o.connect(kit.filt('lowpass', lp, 0.5)).connect(kit.env(kit.out, t, peak, 0.003, release))
}

const fz = (kit: Kit, kind: NoiseKind, t: number, peak: number, release: number, type: BiquadFilterType, f: number, q: number): BiquadFilterNode => {
  const flt = kit.filt(type, f, q)
  kit.noise(kind, t, t + release * 1.7 + 0.01).connect(flt).connect(kit.env(kit.out, t, peak, 0.003, release))
  return flt
}

const hit = (kit: Kit, t: number, peak: number, f = 2600, click = 0): void => {
  fz(kit, 'white', t, peak, 0.006, 'bandpass', f, 0.9)
  if (click > 0) pip(kit, 'p25', 1100, t, click, 0.005, 3000)
}

const run = (t: number, span: number, n: number, each: (at: number, i: number, p: number) => void): void => {
  for (let i = 0; i < n; i += 1) {
    const p = i / n
    each(t + span * Math.pow(p, 1.35), i, p)
  }
}

const SOUNDS: Record<SoundName, Record<Variant, SoundFn>> = {
  blast: {
    A: (kit, t) => {
      hit(kit, t, 0.4, 2400, 0.12)
      tup(kit, 'triangle', 210 + 30 * kit.k, 58, t, 0.6, 0.07, 1600)
      fz(kit, 'crackle', t + 0.004, 0.45, 0.035, 'bandpass', 1800, 0.8)
      return 0.12
    },
    B: (kit, t) => {
      hit(kit, t, 0.25, 2000, 0.1)
      tup(kit, 'p25', 240, 60, t, 0.32, 0.08, 1800)
      fz(kit, 'white', t, 0.34, 0.06, 'bandpass', 1800, 0.9)
      return 0.18
    },
    C: (kit, t) => {
      hit(kit, t, 0.3, 3000)
      tup(kit, 'triangle', 140, 48, t, 0.38, 0.09, 1500)
      fz(kit, 'crackle', t + 0.006, 0.7, 0.09, 'bandpass', 2600, 0.7)
      fz(kit, 'white', t, 0.18, 0.03, 'highpass', 1500, 0.5)
      return 0.2
    },
  },
  tear: {
    A: (kit, t) => {
      hit(kit, t, 0.26, 3200)
      const o = kit.osc('square', 118, t, t + 0.11)
      kit.flutter(o.frequency, t, t + 0.11, 45, 14)
      o.connect(kit.filt('bandpass', 1700, 1.8)).connect(kit.env(kit.out, t, 0.4, 0.003, 0.055))
      fz(kit, 'white', t + 0.01, 0.12, 0.04, 'highpass', 2500, 0.6)
      return 0.1
    },
    B: (kit, t) => {
      const o = kit.osc('p25', 170, t, t + 0.12)
      kit.flutter(o.frequency, t, t + 0.12, 30, 28)
      o.connect(kit.filt('lowpass', 2000, 0.5)).connect(kit.env(kit.out, t, 0.2, 0.004, 0.06))
      fz(kit, 'white', t, 0.22, 0.03, 'bandpass', 2200, 1)
      return 0.12
    },
    C: (kit, t) => {
      const bp = kit.filt('bandpass', 3000, 1)
      sweep(bp.frequency, t, [[0.08, 900]])
      const g = kit.env(kit.out, t, 0.42, 0.003, 0.07)
      kit.noise('white', t, t + 0.13).connect(bp).connect(kit.wobble(g, t, t + 0.13, 42, 0.7))
      return 0.13
    },
  },
  generate: {
    A: (kit, t) => {
      const d = kit.dur
      run(t, d * 0.68, 11, (at, _i, p) => {
        fz(kit, 'white', at, 0.14 + 0.08 * p, 0.009, 'bandpass', 1200 * Math.pow(2.6, p), 2)
      })
      const at = t + d * 0.76
      hit(kit, at, 0.12, 3000)
      pip(kit, 'triangle', 659.25, at, 0.34, 0.11, 2800, 880)
      return d * 0.76 + 0.19
    },
    B: (kit, t) => {
      const d = kit.dur
      run(t, d * 0.72, 14, (at, _i, p) => {
        pip(kit, 'p25', 1200, at, 0.11 - 0.04 * p, 0.008, 2200)
        fz(kit, 'white', at, 0.08, 0.008, 'bandpass', 2600, 1.5)
      })
      pip(kit, 'p25', 659.25, t + d * 0.8, 0.2, 0.15, 2200, 659.25)
      return d * 0.8 + 0.26
    },
    C: (kit, t) => {
      const d = kit.dur
      run(t, d * 0.75, 18, (at, _i, p) => {
        fz(kit, 'white', at, 0.3 - 0.12 * p, 0.012, 'bandpass', 1800, 0.8 + 8 * p)
      })
      fz(kit, 'white', t + d * 0.8, 0.22, 0.04, 'bandpass', 1400, 1.5)
      pip(kit, 'sine', 440, t + d * 0.82, 0.22, 0.16, 2000)
      return d * 0.82 + 0.27
    },
  },
  tick: {
    A: (kit, t) => {
      fz(kit, 'white', t, 0.07, 0.003, 'bandpass', 4000, 1)
      tup(kit, 'triangle', 2000, 1400, t, 0.11, 0.01, 3200)
      return 0.018
    },
    B: (kit, t) => {
      pip(kit, 'p25', 1400 * rand(0.97, 1.03), t, 0.1 * rand(0.7, 1), 0.009, 2600)
      return 0.018
    },
    C: (kit, t) => {
      fz(kit, 'white', t, 0.22 * rand(0.7, 1), 0.007, 'bandpass', 3500, 1.5)
      return 0.014
    },
  },
  flight: {
    A: (kit, t) => {
      const d = kit.dur
      const bp = kit.filt('bandpass', 800, 1.1)
      sweep(bp.frequency, t, [[d * 0.5, 3000], [d, 1400]])
      kit.noise('white', t, t + d + 0.02).connect(bp).connect(kit.curve(kit.out, t, [[0, 0], [0.015, 0.34], [d * 0.35, 0.26], [d, 0]]))
      const o = kit.osc('triangle', 400, t, t + d)
      o.frequency.exponentialRampToValueAtTime(600, t + d * 0.6)
      o.connect(kit.curve(kit.out, t, [[0, 0], [0.01, 0.08], [d, 0]]))
      return d
    },
    B: (kit, t) => {
      const d = kit.dur
      const o = kit.osc('p25', 220, t, t + d)
      o.frequency.exponentialRampToValueAtTime(440, t + d * 0.75)
      o.connect(kit.filt('lowpass', 1800, 0.5)).connect(kit.curve(kit.out, t, [[0, 0], [0.008, 0.16], [d * 0.6, 0.1], [d, 0]]))
      const bp = kit.filt('bandpass', 900, 1)
      sweep(bp.frequency, t, [[d * 0.7, 2400]])
      kit.noise('white', t, t + d).connect(bp).connect(kit.curve(kit.out, t, [[0, 0], [d * 0.4, 0.2], [d, 0]]))
      return d
    },
    C: (kit, t) => {
      const d = kit.dur
      const bp = kit.filt('bandpass', 400, 1.3)
      sweep(bp.frequency, t, [[d * 0.85, 3000]])
      kit.noise('white', t, t + d).connect(bp).connect(kit.curve(kit.out, t, [[0, 0], [0.01, 0.15], [d * 0.6, 0.36], [d, 0]]))
      fz(kit, 'crackle', t + d * 0.7, 0.4, 0.06, 'bandpass', 2600, 0.7)
      return d + 0.03
    },
  },
  lang: {
    A: (kit, t) => {
      hit(kit, t, 0.16, 3000)
      pip(kit, 'p25', 880, t + 0.004, 0.26, 0.06, 2400, 988)
      fz(kit, 'white', t + 0.03, 0.08, 0.03, 'bandpass', 1800, 1)
      return 0.11
    },
    B: (kit, t) => {
      fz(kit, 'white', t, 0.26, 0.02, 'bandpass', 2200, 1.2)
      fz(kit, 'white', t + 0.04, 0.2, 0.02, 'bandpass', 1500, 1.2)
      pip(kit, 'p25', 698.46, t + 0.08, 0.18, 0.1, 2200, 784)
      return 0.25
    },
    C: (kit, t) => {
      fz(kit, 'white', t, 0.3, 0.02, 'bandpass', 2400, 1)
      fz(kit, 'white', t + 0.035, 0.26, 0.02, 'bandpass', 1700, 1)
      fz(kit, 'white', t + 0.07, 0.2, 0.025, 'bandpass', 1100, 1)
      pip(kit, 'sine', 587.33, t + 0.1, 0.16, 0.1, 2000)
      return 0.27
    },
  },
  rocket: {
    A: (kit, t) => {
      const d = kit.dur
      fz(kit, 'white', t, 0.3, 0.02, 'lowpass', 1800, 0.6)
      tup(kit, 'triangle', 160, 90, t, 0.25, 0.03, 900)
      const o = kit.osc('triangle', 700, t, t + d + 0.02)
      o.frequency.exponentialRampToValueAtTime(1500, t + d)
      kit.flutter(o.frequency, t, t + d, 8, 10)
      o.connect(kit.curve(kit.out, t, [[0, 0], [0.03, 0.1], [d * 0.7, 0.16], [d, 0]]))
      kit.noise('white', t, t + d).connect(kit.filt('highpass', 2500, 0.5)).connect(kit.filt('lowpass', 5000, 0.5)).connect(kit.curve(kit.out, t, [[0, 0], [0.03, 0.06], [d, 0]]))
      return d
    },
    B: (kit, t) => {
      const d = kit.dur
      const o = kit.osc('p25', 400, t, t + d + 0.02)
      o.frequency.exponentialRampToValueAtTime(1600, t + d)
      o.connect(kit.filt('lowpass', 2400, 0.5)).connect(kit.curve(kit.out, t, [[0, 0], [0.01, 0.1], [d * 0.7, 0.12], [d, 0]]))
      kit.noise('white', t, t + d).connect(kit.filt('highpass', 3000, 0.5)).connect(kit.curve(kit.out, t, [[0, 0], [0.03, 0.05], [d, 0]]))
      return d
    },
    C: (kit, t) => {
      const d = kit.dur
      const bp = kit.filt('bandpass', 800, 5)
      sweep(bp.frequency, t, [[d, 3200]])
      kit.noise('white', t, t + d + 0.02).connect(bp).connect(kit.curve(kit.out, t, [[0, 0], [0.02, 0.4], [d * 0.8, 0.6], [d, 0]]))
      return d
    },
  },
  burst: {
    A: (kit, t) => {
      hit(kit, t, 0.42, 2200, 0.1)
      tup(kit, 'triangle', 150, 44, t, 0.55 * (0.6 + 0.4 * kit.k), 0.11, 1300)
      fz(kit, 'crackle', t + 0.03, 0.6, 0.25, 'bandpass', 2200, 0.6)
      return 0.44
    },
    B: (kit, t) => {
      hit(kit, t, 0.3, 2000, 0.1)
      tup(kit, 'p25', 160, 50, t, 0.3, 0.1, 1500)
      fz(kit, 'white', t, 0.3, 0.035, 'lowpass', 1300, 0.6)
      fz(kit, 'crackle', t + 0.03, 0.55, 0.26, 'bandpass', 2400, 0.7)
      return 0.46
    },
    C: (kit, t) => {
      fz(kit, 'white', t, 0.4, 0.06, 'bandpass', 1500, 0.8)
      tup(kit, 'triangle', 100, 45, t, 0.3, 0.1, 1000)
      fz(kit, 'crackle', t + 0.02, 0.75, 0.28, 'bandpass', 3000, 0.7)
      return 0.48
    },
  },
  sprite: {
    A: (kit, t) => {
      hit(kit, t, 0.36, 2400, 0.08)
      tup(kit, 'triangle', 170, 55, t, 0.48, 0.09, 1300)
      fz(kit, 'crackle', t + 0.03, 0.45, 0.2, 'bandpass', 2800, 0.7)
      pip(kit, 'triangle', 1567.98, t + 0.05, 0.2, 0.09, 4000, 1760)
      return 0.38
    },
    B: (kit, t) => {
      hit(kit, t, 0.26, 2200, 0.08)
      tup(kit, 'p25', 170, 55, t, 0.28, 0.09, 1500)
      fz(kit, 'crackle', t + 0.02, 0.5, 0.22, 'bandpass', 2400, 0.7)
      pip(kit, 'p25', 1046.5, t + 0.06, 0.12, 0.1, 2600)
      return 0.4
    },
    C: (kit, t) => {
      fz(kit, 'white', t, 0.36, 0.05, 'bandpass', 1500, 0.8)
      fz(kit, 'crackle', t + 0.02, 0.7, 0.26, 'bandpass', 2800, 0.7)
      pip(kit, 'sine', 1318.5, t + 0.06, 0.12, 0.1, 3000)
      return 0.45
    },
  },
  hover: {
    A: (kit, t) => {
      fz(kit, 'white', t, 0.04, 0.003, 'bandpass', 3200, 1)
      pip(kit, 'triangle', 1500, t, 0.05, 0.007, 3000)
      return 0.015
    },
    B: (kit, t) => {
      pip(kit, 'p25', 900, t, 0.045, 0.01, 2000)
      return 0.02
    },
    C: (kit, t) => {
      fz(kit, 'white', t, 0.09, 0.008, 'bandpass', 4000, 1.2)
      return 0.015
    },
  },
  toggle: {
    A: (kit, t) => {
      hit(kit, t, 0.18, 2600)
      pip(kit, 'p25', 523.25, t + 0.005, 0.2, 0.045, 2400)
      pip(kit, 'triangle', 783.99, t + 0.06, 0.26, 0.09, 2600)
      fz(kit, 'white', t + 0.06, 0.07, 0.04, 'lowpass', 2200, 0.6)
      return 0.21
    },
    B: (kit, t) => {
      fz(kit, 'white', t, 0.18, 0.03, 'bandpass', 1800, 1)
      pip(kit, 'p25', 523.25, t + 0.025, 0.2, 0.11, 2400, 1046.5)
      return 0.22
    },
    C: (kit, t) => {
      tup(kit, 'sine', 70, 55, t, 0.3, 0.08, 400)
      fz(kit, 'white', t + 0.01, 0.26, 0.06, 'highpass', 1500, 0.5)
      pip(kit, 'triangle', 1318.5, t + 0.07, 0.1, 0.06, 2600)
      return 0.18
    },
  },
}

const DEFAULT_DURATIONS: Partial<Record<SoundName, number>> = {
  generate: 0.9,
  flight: 0.3,
  rocket: 0.8,
}

const WORKLET_SRC = `
class CrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bits', defaultValue: 10, minValue: 1, maxValue: 16, automationRate: 'k-rate' },
      { name: 'rate', defaultValue: 20000, minValue: 500, maxValue: 96000, automationRate: 'k-rate' },
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
  const vinyl = make(impulses(0.0012))
  return { white, pink, brown, crackle, vinyl }
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

export type Measurement = { peak: number; peakDb: number; duration: number; rendered: number }

const analyse = (out: AudioBuffer, start: number, seconds: number): Measurement => {
  const chans = Array.from({ length: out.numberOfChannels }, (_, ch) => out.getChannelData(ch))
  let peak = 0
  for (const d of chans) for (let i = 0; i < d.length; i += 1) peak = Math.max(peak, Math.abs(d[i] ?? 0))
  const floor = peak * 0.001
  let last = 0
  for (const d of chans) for (let i = d.length - 1; i > last; i -= 1) if (Math.abs(d[i] ?? 0) > floor) last = i
  return { peak, peakDb: 20 * Math.log10(Math.max(peak, 1e-9)), duration: Math.max(0, last / out.sampleRate - start), rendered: seconds }
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
