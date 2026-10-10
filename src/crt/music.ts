export type Band = {
  ctx: BaseAudioContext
  bus: GainNode
  echo: DelayNode
  noise: AudioBuffer
  pulse(duty: number): PeriodicWave
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

const pan = (band: Band, x: number) => {
  const p = band.ctx.createStereoPanner()
  p.pan.value = x
  p.connect(band.bus)
  return p
}

export const noiseBuffer = (ctx: BaseAudioContext) => {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = b.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04
    d[i] = last * 3.2
  }
  return b
}

export const pulseWave = (ctx: BaseAudioContext, duty: number) => {
  const n = 48
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)
  return ctx.createPeriodicWave(real, imag)
}

type ChipOpts = { echo?: boolean; vibrato?: boolean; cutoff?: number; sustain?: number }

export const chip = (band: Band, t: number, midi: number, len: number, level: number, duty: number, x: number, opts: ChipOpts = {}) => {
  const { ctx } = band
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(level, t + 0.008)
  g.gain.setValueAtTime(level * (opts.sustain ?? 0.75), t + 0.06)
  g.gain.exponentialRampToValueAtTime(0.0001, t + len)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = opts.cutoff ?? 3600
  g.connect(lp).connect(pan(band, x))
  if (opts.echo) lp.connect(band.echo)
  const o = ctx.createOscillator()
  o.setPeriodicWave(band.pulse(duty))
  o.frequency.value = hz(midi)
  if (opts.vibrato && len > 0.4) {
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 5.5
    const depth = ctx.createGain()
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(14, t + 0.28)
    lfo.connect(depth).connect(o.detune)
    lfo.start(t)
    lfo.stop(t + len + 0.05)
  }
  o.connect(g)
  o.start(t)
  o.stop(t + len + 0.05)
}

export const chipDrum = (band: Band, t: number, kind: 'snare' | 'hat') => {
  const { ctx } = band
  const src = ctx.createBufferSource()
  src.buffer = band.noise
  const f = ctx.createBiquadFilter()
  const g = ctx.createGain()
  if (kind === 'snare') {
    f.type = 'bandpass'
    f.frequency.value = 1500
    f.Q.value = 0.6
    g.gain.setValueAtTime(0.11, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
  } else {
    f.type = 'highpass'
    f.frequency.value = 6000
    g.gain.setValueAtTime(0.03, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  }
  src.connect(f).connect(g).connect(pan(band, 0.1))
  src.start(t, Math.random() * 0.5)
  src.stop(t + 0.2)
}

export const arcade = (band: Band, t: number, notes: readonly number[], len: number, beats: number) => {
  const step = len / beats
  const root = Math.min(...notes) - 12
  const bassRoot = (root % 12) + 36
  for (const [at, up, hold] of [
    [0, 0, 1.4],
    [1.5, 12, 1.4],
    [3, 7, 0.9],
  ])
    chip(band, t + at * step, bassRoot + up, step * hold * 0.6, 0.1, 0.5, 0, { cutoff: 1400, sustain: 0.6 })
  const arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 24]
  for (let k = 0; k < beats * 4; k++) chip(band, t + (k * step) / 4, arp[k % 4], step * 0.22, 0.025, 0.125, k % 2 ? 0.35 : -0.35, { cutoff: 4200, sustain: 0.4 })
}

export const firework = (band: Band, t: number, kind: 'whistle' | 'boom', x = 0, level = 1) => {
  const { ctx } = band
  const noise = (len: number, type: BiquadFilterType, freq: number, q: number, gain: number, decay: number, at = t) => {
    const src = ctx.createBufferSource()
    src.buffer = band.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain * level, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay)
    src.connect(f).connect(g).connect(pan(band, x))
    src.start(at, Math.random() * 0.5)
    src.stop(at + len)
  }
  const tone = (type: OscillatorType, from: number, to: number, gain: number, decay: number) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(from, t)
    o.frequency.exponentialRampToValueAtTime(to, t + decay * 0.6)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain * level, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    o.connect(g).connect(pan(band, x))
    o.start(t)
    o.stop(t + decay + 0.05)
  }
  if (kind === 'boom') {
    tone('triangle', 170, 46, 0.3, 0.2)
    tone('sine', 80, 44, 0.22, 0.32)
    noise(0.3, 'lowpass', 500, 0.7, 0.14, 0.12)
    for (let k = 0; k < 7; k++) noise(0.04, 'bandpass', 1000 + Math.random() * 1600, 3, 0.035, 0.025, t + 0.15 + Math.random() * 0.5)
    return
  }
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(420, t)
  o.frequency.exponentialRampToValueAtTime(980, t + 0.85)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.025 * level, t + 0.5)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1400
  o.connect(g).connect(lp).connect(pan(band, x))
  o.start(t)
  o.stop(t + 0.95)
  noise(0.9, 'bandpass', 700, 2, 0.03, 0.9)
}
