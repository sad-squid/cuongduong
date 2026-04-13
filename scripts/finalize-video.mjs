import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'capture-output')

const warm = process.argv.includes('warm')
const gyroid = process.argv.includes('gyroid')
const variant = gyroid ? 'gyroid' : warm ? 'warm' : 'default'

const webm = join(OUT_DIR, 'glitch.webm')
const meta = JSON.parse(readFileSync(join(OUT_DIR, 'events.json'), 'utf8'))
const events = Array.isArray(meta) ? meta : meta.events
const trimOffsetSec = Array.isArray(meta) ? 0 : meta.trimOffsetSec ?? 0
const durationSec = Array.isArray(meta) ? 0 : (meta.durationMs ?? 0) / 1000
const suffix = process.env.SUFFIX ? `-${process.env.SUFFIX}` : ''
const out = join(OUT_DIR, `glitch${variant === 'default' ? '' : '-' + variant}${suffix}.mp4`)

// One SFX input per event — randomized between "static burst" and "digital click"
const inputs = []
const filters = []
const mixLabels = []

// Pentatonic (D major pentatonic, bright & friendly) for AC-style chatter
const AC_FREQS = [587, 659, 740, 880, 988, 1174, 1318]

let inputIdx = 1 // 0=video, 1=bed, 2+ = sfx
events.forEach((t, i) => {
  const delayMs = Math.round(t)
  if (gyroid) {
    // Gyroid: low, wobbly, hollow wooden "bwop". 1-3 hits with pitch wobble + detuned layer.
    const GYRO_FREQS = [110, 131, 147, 165, 196, 220, 247, 262]
    const count = 1 + Math.floor(Math.random() * 3)
    const sublabels = []
    for (let j = 0; j < count; j++) {
      const f = GYRO_FREQS[Math.floor(Math.random() * GYRO_FREQS.length)]
      const detune = f * (1 + (Math.random() * 0.02 - 0.01))
      const dur = 0.14 + Math.random() * 0.18
      const vol = 0.42 + Math.random() * 0.15
      const vibHz = 5 + Math.random() * 4
      const vibDepth = (0.3 + Math.random() * 0.4).toFixed(2)
      const offset = delayMs + j * (110 + Math.floor(Math.random() * 90))
      const src = `sine=f=${f}:d=${dur.toFixed(3)},vibrato=f=${vibHz.toFixed(1)}:d=${vibDepth},lowpass=f=2800,volume=${vol.toFixed(2)},aformat=sample_fmts=fltp`
      const srcDetune = `sine=f=${detune.toFixed(1)}:d=${dur.toFixed(3)},vibrato=f=${vibHz.toFixed(1)}:d=${vibDepth},lowpass=f=2800,volume=${(vol * 0.8).toFixed(2)},aformat=sample_fmts=fltp`
      inputs.push('-f', 'lavfi', '-t', dur.toFixed(3), '-i', src)
      inputIdx++
      const idxA = inputIdx
      inputs.push('-f', 'lavfi', '-t', dur.toFixed(3), '-i', srcDetune)
      inputIdx++
      const idxB = inputIdx
      const fadeOut = Math.max(0.01, dur - 0.05)
      const la = `g${i}_${j}a`
      const lb = `g${i}_${j}b`
      filters.push(
        `[${idxA}:a]afade=t=in:d=0.006,afade=t=out:st=${fadeOut.toFixed(3)}:d=0.04,adelay=${offset}|${offset}[${la}]`,
      )
      filters.push(
        `[${idxB}:a]afade=t=in:d=0.006,afade=t=out:st=${fadeOut.toFixed(3)}:d=0.04,adelay=${offset}|${offset}[${lb}]`,
      )
      sublabels.push(`[${la}]`, `[${lb}]`)
    }
    mixLabels.push(...sublabels)
  } else if (warm) {
    // Animal-Crossing style: a little chattery "bebebe" of 2-4 short blips at nearby pitches
    const count = 2 + Math.floor(Math.random() * 3)
    let anchor = AC_FREQS[Math.floor(Math.random() * AC_FREQS.length)]
    const sublabels = []
    for (let j = 0; j < count; j++) {
      const jitter = [0, 0, -1, 1, 2][Math.floor(Math.random() * 5)]
      const f = AC_FREQS[Math.max(0, Math.min(AC_FREQS.length - 1, AC_FREQS.indexOf(anchor) + jitter))]
      const dur = 0.05 + Math.random() * 0.04
      const vol = 0.22 + Math.random() * 0.1
      const offset = delayMs + j * (55 + Math.floor(Math.random() * 25))
      inputs.push('-f', 'lavfi', '-t', dur.toFixed(3), '-i',
        `sine=f=${f}:d=${dur.toFixed(3)},volume=${vol.toFixed(2)},aformat=sample_fmts=fltp`)
      inputIdx++
      const fadeOut = Math.max(0.005, dur - 0.02)
      const label = `e${i}_${j}`
      filters.push(
        `[${inputIdx}:a]afade=t=in:d=0.004,afade=t=out:st=${fadeOut.toFixed(3)}:d=0.015,adelay=${offset}|${offset}[${label}]`,
      )
      sublabels.push(`[${label}]`)
    }
    mixLabels.push(...sublabels)
  } else {
    const isStatic = Math.random() < 0.55
    const dur = isStatic ? 0.08 + Math.random() * 0.14 : 0.04 + Math.random() * 0.06
    let src
    if (isStatic) {
      const hp = 600 + Math.floor(Math.random() * 1200)
      const lp = 3500 + Math.floor(Math.random() * 3500)
      src = `anoisesrc=c=white:a=${(0.18 + Math.random() * 0.22).toFixed(2)}:d=${dur.toFixed(3)},highpass=f=${hp},lowpass=f=${lp}`
    } else {
      const f = 600 + Math.floor(Math.random() * 2400)
      src = `sine=f=${f}:d=${dur.toFixed(3)},volume=${(0.25 + Math.random() * 0.35).toFixed(2)},aformat=sample_fmts=fltp`
    }
    inputs.push('-f', 'lavfi', '-t', dur.toFixed(3), '-i', src)
    inputIdx++
    const fadeOut = Math.max(0.005, dur - 0.03)
    filters.push(
      `[${inputIdx}:a]afade=t=in:d=0.003,afade=t=out:st=${fadeOut.toFixed(3)}:d=0.02,adelay=${delayMs}|${delayMs}[e${i}]`,
    )
    mixLabels.push(`[e${i}]`)
  }
})

const bedSrc =
  gyroid ? 'anoisesrc=c=pink:a=0.02,lowpass=f=500'
  : warm ? 'anoisesrc=c=pink:a=0.01'
  : 'anoisesrc=c=pink:a=0.08,highpass=f=800,lowpass=f=4000'

inputs.unshift('-f', 'lavfi', '-t', '30', '-i', bedSrc)

const bedVol = gyroid ? 0.1 : warm ? 0.05 : 0.25
filters.push(`[1:a]volume=${bedVol}[bed]`)
const mixInputs = ['[bed]', ...mixLabels].join('')
filters.push(
  `${mixInputs}amix=inputs=${1 + mixLabels.length}:normalize=0:duration=first[aout]`,
)

const filterComplex = filters.join(';')

const videoInputArgs = ['-i', webm]
if (trimOffsetSec > 0) videoInputArgs.unshift('-ss', trimOffsetSec.toFixed(3))
if (durationSec > 0) videoInputArgs.unshift('-t', durationSec.toFixed(3))

const args = [
  '-y',
  ...videoInputArgs,
  ...inputs,
  '-filter_complex',
  filterComplex,
  '-map',
  '0:v:0',
  '-map',
  '[aout]',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-preset',
  'medium',
  '-crf',
  '20',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-movflags',
  '+faststart',
  '-shortest',
  out,
]

console.log('Running ffmpeg...')
execFileSync('ffmpeg', args, { stdio: 'inherit' })
console.log(`Wrote ${out}`)
