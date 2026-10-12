import { readPrefs, writePrefs } from './soundLevel'

export type SoundName =
  | 'tear'
  | 'generate'
  | 'tick'
  | 'rocket'
  | 'burst'
  | 'toggle'
  | 'shot'
  | 'hurt'
  | 'powerup'
  | 'over'
  | 'clear'

export type PlayOptions = {
  intensity?: number
  pan?: number
  duration?: number
  landing?: boolean
}

type ChainSettings = {
  volume: number
  bits: number
  rate: number
  tone: number
}

export type SoundApi = {
  readonly enabled: boolean
  readonly sfx: boolean
  readonly music: boolean
  readonly musicActive: boolean
  setSfx(on: boolean): void
  setMusic(on: boolean): void
  setEnabled(on: boolean): void
  play(name: SoundName, opts?: PlayOptions): void
  setSettings(next: Partial<ChainSettings>): void
  audioClock(): { time: number; latency: number } | null
  wake(): void
  musicBus(echoTime: number, level?: number, fadeIn?: number): MusicBus | null
}

export type MusicBus = { band: Band; stop(fade: number): void }

const MUSIC_LEVEL = 1.6

export type Band = {
  ctx: BaseAudioContext
  bus: GainNode
  echo: DelayNode
  noise: AudioBuffer
  pulse(duty: number): PeriodicWave
}

const noiseBuffer = (ctx: BaseAudioContext) => {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = b.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04
    d[i] = last * 3.2
  }
  return b
}

const musicPulse = (ctx: BaseAudioContext, duty: number) => {
  const n = 48
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)
  return ctx.createPeriodicWave(real, imag)
}

const DEFAULT_SETTINGS: ChainSettings = { volume: 0.3, bits: 10, rate: 18000, tone: 2800 }

type Limit = { max: number; gap: number; steal: boolean }

const LIMITS: Record<SoundName, Limit> = {
  tear: { max: 2, gap: 0.08, steal: true },
  generate: { max: 3, gap: 0.08, steal: true },
  tick: { max: 3, gap: 0.03, steal: false },
  rocket: { max: 3, gap: 0.08, steal: true },
  burst: { max: 4, gap: 0.05, steal: true },
  toggle: { max: 1, gap: 0.1, steal: true },
  shot: { max: 2, gap: 0.12, steal: true },
  hurt: { max: 1, gap: 0.3, steal: true },
  powerup: { max: 1, gap: 0.2, steal: true },
  over: { max: 1, gap: 1, steal: true },
  clear: { max: 1, gap: 0.5, steal: true },
}

const MAX_VOICES = 14

const LEVEL_SPREAD = 0.1

const PITCH_SPREAD = 0.03

const TRIM: Record<SoundName, number> = {
  tear: 1.25,
  generate: 0.6,
  tick: 1.8,
  rocket: 0.95,
  burst: 0.62,
  toggle: 1.9,
  shot: 0.5,
  hurt: 0.75,
  powerup: 0.85,
  over: 0.85,
  clear: 1,
}

type Shape = 'sine' | 'triangle' | 'square' | 'p25'
type NoiseKind = 'white' | 'pink' | 'brown' | 'grit'
type Point = readonly [number, number]

type Kit = {
  ctx: BaseAudioContext
  out: AudioNode
  k: number
  dur: number
  land: boolean
  osc(shape: Shape, freq: number, t: number, end: number): OscillatorNode
  env(dest: AudioNode, t: number, peak: number, attack: number, release: number): GainNode
  curve(dest: AudioNode, t: number, points: readonly Point[]): GainNode
  noise(kind: NoiseKind, t: number, end: number, rate?: number): AudioBufferSourceNode
  filt(type: BiquadFilterType, freq: number, q: number): BiquadFilterNode
  flutter(param: AudioParam, t: number, end: number, hz: number, depth: number): void
  wobble(dest: AudioNode, t: number, end: number, hz: number, depth: number): GainNode
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

const note = (kit: Kit, t: number, f: number, peak: number, release: number, square = 0.35, lp = 1300): void => {
  tup(kit, 'triangle', f, f * 0.995, t, peak, release, lp, 0.006)
  if (square > 0) tup(kit, 'p25', f, f * 0.995, t, peak * square, release * 0.8, lp * 0.6, 0.006)
}

const arp = (kit: Kit, t: number, notes: readonly number[], step: number, peak: number, release: number, last: number, square?: number, lp?: number): number => {
  notes.forEach((f, i) => note(kit, t + i * step, f, peak, i === notes.length - 1 ? last : release, square, lp))
  return (notes.length - 1) * step + last * 1.7
}

const thump = (kit: Kit, t: number, from: number, to: number, peak: number, release: number, crunch: number): void => {
  boom(kit, t, from, to, peak, release)
  fz(kit, 'brown', t, peak * 0.8, release * 0.6, 'lowpass', 380, 0.6, 0.006)
  const o = kit.osc('square', from * 1.6, t, t + release * 1.7 + 0.02)
  o.frequency.exponentialRampToValueAtTime(to * 1.4, t + release * 0.8)
  o.connect(kit.filt('lowpass', 520, 0.7)).connect(kit.env(kit.out, t, crunch, 0.004, release * 0.8))
}

const SOUNDS: Record<SoundName, SoundFn> = {
  tear: (kit, t) => {
    hit(kit, t, 0.16, 2400)
    const o = kit.osc('square', 140, t, t + 0.12)
    kit.flutter(o.frequency, t, t + 0.12, 35, 16)
    o.connect(kit.filt('lowpass', 900, 1)).connect(kit.env(kit.out, t, 0.32, 0.004, 0.06))
    fz(kit, 'white', t, 0.12, 0.04, 'lowpass', 1500, 0.6)
    return 0.11
  },
  generate: (kit, t) => {
    const d = kit.dur
    settle(kit, t, d, 0.3, 0.26, 1900, 0.5)
    if (kit.land) landing(kit, t + d * 0.78)
    return d * 0.78 + 0.15
  },
  tick: (kit, t) => {
    tok(kit, t, 420, 0.08, 0.02)
    return 0.04
  },
  rocket: (kit, t) => {
    const d = kit.dur
    fz(kit, 'brown', t, 0.6, 0.12, 'lowpass', 400, 0.6, 0.01)
    boom(kit, t, 90, 60, 0.35, 0.1)
    const lp = kit.filt('lowpass', 250, 0.7)
    sweep(lp.frequency, t, [[d, 900]])
    kit.noise('white', t, t + d + 0.02).connect(lp).connect(kit.curve(kit.out, t, [[0, 0], [0.04, 0.2], [d * 0.6, 0.35], [d, 0]]))
    return d
  },
  burst: (kit, t) => {
    boom(kit, t, 70, 40, 0.6 * (0.6 + 0.4 * kit.k), 0.2)
    tup(kit, 'triangle', 130, 60, t, 0.16, 0.12, 400, 0.01)
    grit(kit, t + 0.06, 0.55, 0.2, 1800)
    return 0.45
  },
  toggle: (kit, t) => {
    tok(kit, t, 360, 0.22, 0.03)
    tok(kit, t + 0.075, 300, 0.2, 0.035)
    return 0.14
  },
  shot: (kit, t) => SOUNDS.rocket(kit, t),
  hurt: (kit, t) => {
    thump(kit, t, 120, 42, 0.62, 0.2, 0.2)
    grit(kit, t + 0.012, 0.42, 0.16, 1300)
    return 0.38
  },
  powerup: (kit, t) => {
    tok(kit, t, 300, 0.1, 0.025)
    return arp(kit, t, [196, 247, 294], 0.07, 0.3, 0.06, 0.1)
  },
  over: (kit, t) => {
    const end = arp(kit, t, [294, 247, 196, 147], 0.13, 0.28, 0.1, 0.28, 0.3, 1100)
    boom(kit, t + 0.39, 80, 45, 0.3, 0.25)
    return end
  },
  clear: (kit, t) => {
    const end = arp(kit, t, [196, 294], 0.1, 0.24, 0.08, 0.16)
    landing(kit, t + 0.28)
    return Math.max(end, 0.43)
  },
}

const DEFAULT_DURATIONS: Partial<Record<SoundName, number>> = {
  generate: 0.9,
  rocket: 0.6,
  shot: 0.14,
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
  return { white, pink, brown, grit }
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

type Engine = {
  ctx: BaseAudioContext
  master: GainNode
  ready: Promise<void>
  apply(s: ChainSettings): void
  voice(name: SoundName, t: number, opts: PlayOptions): { gain: GainNode; end: number }
  musicInput(): GainNode
}

const createEngine = (ctx: BaseAudioContext, initial: ChainSettings): Engine => {
  const buffers = makeBuffers(ctx)
  const waves = { p25: pulseWave(ctx, 0.25) }
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
    if (shape === 'p25') o.setPeriodicWave(waves.p25)
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

  const voice = (name: SoundName, t: number, opts: PlayOptions): { gain: GainNode; end: number } => {
    const k = clamp(opts.intensity ?? 1, 0, 1)
    const gain = ctx.createGain()
    const cents = 1200 * Math.log2(1 + rand(-PITCH_SPREAD, PITCH_SPREAD))
    gain.gain.value = (0.45 + 0.55 * k) * TRIM[name] * rand(1 - LEVEL_SPREAD, 1 + LEVEL_SPREAD)
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
    const kit: Kit = { ctx, out: gain, k, dur: opts.duration ?? DEFAULT_DURATIONS[name] ?? 0.5, land: opts.landing ?? true, osc: vOsc, env, curve, noise, filt: vFilt, flutter, wobble }
    const len = SOUNDS[name](kit, t)
    return { gain, end: t + len }
  }

  let musicIn: GainNode | null = null
  const musicInput = (): GainNode => {
    if (musicIn !== null) return musicIn
    const input = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 5200
    lp.Q.value = 0.5
    const verb = ctx.createConvolver()
    const len = Math.floor(ctx.sampleRate * 2.2)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
    }
    verb.buffer = ir
    const wet = ctx.createGain()
    wet.gain.value = 0.3
    const squash = ctx.createDynamicsCompressor()
    squash.threshold.value = -20
    squash.ratio.value = 3
    const out = ctx.createGain()
    out.gain.value = MUSIC_LEVEL
    input.connect(lp)
    lp.connect(squash)
    lp.connect(verb).connect(wet).connect(squash)
    squash.connect(out).connect(master)
    musicIn = input
    return input
  }

  return { ctx, master, ready, apply, voice, musicInput }
}

type Live = { name: SoundName; gain: GainNode; end: number }

export const createSound = (initial: Partial<ChainSettings> = {}): SoundApi => {
  let settings: ChainSettings = { ...DEFAULT_SETTINGS, ...initial }
  let engine: Engine | null = null
  let ctx: AudioContext | null = null
  let enabled = false
  const prefs = readPrefs()
  let live: Live[] = []
  const lastAt: Partial<Record<SoundName, number>> = {}

  let noise: AudioBuffer | null = null
  const waves = new Map<number, PeriodicWave>()

  const musicBus = (echoTime: number, level = 1, fadeIn = 0): MusicBus | null => {
    if (!enabled || !prefs.music || engine === null || ctx === null || ctx.state !== 'running') return null
    const c = ctx
    const bus = c.createGain()
    bus.gain.setValueAtTime(fadeIn > 0 ? 0 : level, c.currentTime)
    if (fadeIn > 0) bus.gain.linearRampToValueAtTime(level, c.currentTime + fadeIn)
    bus.connect(engine.musicInput())
    const echo = c.createDelay(1)
    echo.delayTime.value = echoTime
    const fb = c.createGain()
    fb.gain.value = 0.32
    const wet = c.createGain()
    wet.gain.value = 0.22
    const tone = c.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2400
    echo.connect(tone).connect(fb).connect(echo)
    tone.connect(wet).connect(bus)
    noise ??= noiseBuffer(c)
    const band: Band = {
      ctx: c,
      bus,
      echo,
      noise,
      pulse: (duty) => {
        const hit = waves.get(duty)
        if (hit) return hit
        const wave = musicPulse(c, duty)
        waves.set(duty, wave)
        return wave
      },
    }
    let stopped = false
    return {
      band,
      stop: (fade) => {
        if (stopped) return
        stopped = true
        const g = bus.gain
        if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(c.currentTime)
        else {
          g.cancelScheduledValues(c.currentTime)
          g.setValueAtTime(g.value, c.currentTime)
        }
        bus.gain.setTargetAtTime(0, c.currentTime, fade / 4)
        window.setTimeout(() => {
          echo.disconnect()
          tone.disconnect()
          fb.disconnect()
          wet.disconnect()
          bus.disconnect()
        }, fade * 1000 + 300)
      },
    }
  }

  const masterLevel = (): number => (enabled ? settings.volume : 0)

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

  const release = (v: Live, now: number): void => {
    v.gain.gain.cancelScheduledValues(now)
    v.gain.gain.setValueAtTime(v.gain.gain.value, now)
    v.gain.gain.linearRampToValueAtTime(0, now + 0.03)
    v.end = now + 0.03
    window.setTimeout(() => v.gain.disconnect(), 80)
  }

  const play = (name: SoundName, opts: PlayOptions = {}): void => {
    if (!enabled || !prefs.sfx || engine === null || ctx === null) return
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
    const v = engine.voice(name, t, opts)
    const entry: Live = { name, gain: v.gain, end: v.end }
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
      return
    }
    enabled = false
    rampMaster()
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
    get sfx() {
      return prefs.sfx
    },
    get music() {
      return prefs.music
    },
    get musicActive() {
      return enabled && prefs.music
    },
    setSfx: (on: boolean) => {
      prefs.sfx = on
      writePrefs(prefs)
    },
    setMusic: (on: boolean) => {
      prefs.music = on
      writePrefs(prefs)
    },
    setEnabled,
    play,
    wake: () => {
      if (enabled && ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => undefined)
    },
    audioClock: () => (enabled && ctx !== null && ctx.state === 'running' ? { time: ctx.currentTime, latency: ctx.outputLatency || ctx.baseLatency || 0 } : null),
    musicBus,
    setSettings: (next: Partial<ChainSettings>) => {
      settings = { ...settings, ...next }
      if (engine !== null) {
        engine.apply(settings)
        rampMaster()
      }
    },
  }
}
