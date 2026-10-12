import type { Band } from './Sound'

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

const pan = (band: Band, x: number) => {
  const p = band.ctx.createStereoPanner()
  p.pan.value = x
  p.connect(band.bus)
  return p
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

export const chipDrum = (band: Band, t: number, kind: 'kick' | 'snare' | 'hat') => {
  const { ctx } = band
  if (kind === 'kick') {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(160, t)
    o.frequency.exponentialRampToValueAtTime(45, t + 0.1)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.22, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    o.connect(g).connect(pan(band, 0))
    o.start(t)
    o.stop(t + 0.18)
    return
  }
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

export const arcade = (band: Band, t: number, notes: readonly number[], len: number, beats: number, drums = false) => {
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
  if (!drums) return
  for (let k = 0; k < beats * 2; k++) {
    const at = t + (k * step) / 2
    if (k % 8 === 0 || k % 8 === 3 || k % 8 === 6) chipDrum(band, at, 'kick')
    if (k % 4 === 2) chipDrum(band, at, 'snare')
    chipDrum(band, at, 'hat')
  }
}

