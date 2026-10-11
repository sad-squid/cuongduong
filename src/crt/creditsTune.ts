import { RISE_MS, type ShotKind } from './Fireworks'

export { RISE_MS }
export const BPM = 126
export const BEAT_MS = 60000 / BPM
const BAR_BEATS = 4
export const BAR_MS = BAR_BEATS * BEAT_MS
const BARS = 16
const ENDS: readonly number[] = [3, 7, 11, 15]
export const WHISTLE_LEAD = 0.6

const KICKS = [0, 1.5, 3]
const FILLS = [3.33, 3.66]
const SPRITE_DOWNBEATS: readonly number[] = [1, 5, 9, 13]

export const midiOf = (name: string): number => {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name)
  if (!m) throw new Error(`bad note ${name}`)
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
  return 12 * (Number(m[3]) + 1) + base
}

export type Note = { beat: number; midi: number; len: number }

export const seq = (bars: [string | null, number][][]): Note[] => {
  const out: Note[] = []
  bars.forEach((bar, i) => {
    let t = i * BAR_BEATS
    for (const [note, len] of bar) {
      if (note) out.push({ beat: t, midi: midiOf(note), len })
      t += len
    }
  })
  return out
}

export const MELODY: readonly Note[] = seq([
  [['A5', 0.5], ['C6', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 1], ['C5', 1]],
  [['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 2]],
  [['D5', 0.5], ['F5', 0.5], ['A5', 1], ['D6', 1], ['C6', 1]],
  [['Bb5', 1.5], ['A5', 0.5], ['F5', 2]],
  [['A5', 0.5], ['C6', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 1], ['A5', 1]],
  [['G5', 0.5], ['E5', 0.5], ['C5', 1], ['E5', 1], ['G5', 1]],
  [['F5', 0.5], ['G5', 0.5], ['A5', 1], ['Bb5', 1], ['D6', 1]],
  [['C6', 3], [null, 1]],
  [['D6', 1], ['C6', 0.5], ['A5', 0.5], ['F5', 1], ['A5', 1]],
  [['Bb5', 1], ['A5', 0.5], ['G5', 0.5], ['F5', 1], ['D5', 1]],
  [['C5', 0.5], ['F5', 0.5], ['A5', 1], ['C6', 1], ['A5', 1]],
  [['G5', 3], ['E5', 1]],
  [['D5', 0.5], ['F5', 0.5], ['Bb5', 1], ['D6', 1], ['C6', 1]],
  [['C6', 1], ['Bb5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1]],
  [['F5', 1], ['A5', 1], ['C6', 2]],
  [['A5', 0.5], ['C6', 0.5], ['F5', 3]],
])

export const CHORDS: readonly number[][] = [
  ['F3', 'A3', 'C4'],
  ['E3', 'G3', 'C4'],
  ['F3', 'A3', 'D4'],
  ['F3', 'Bb3', 'D4'],
  ['F3', 'A3', 'C4'],
  ['E3', 'G3', 'C4'],
  ['F3', 'Bb3', 'D4'],
  ['E3', 'G3', 'C4'],
  ['F3', 'A3', 'D4'],
  ['F3', 'Bb3', 'D4'],
  ['F3', 'A3', 'C4'],
  ['E3', 'G3', 'C4'],
  ['F3', 'Bb3', 'D4'],
  ['E3', 'G3', 'C4'],
  ['F3', 'A3', 'C4'],
  ['F3', 'A3', 'C4'],
].map((chord) => chord.map(midiOf))

const LO = Math.min(...MELODY.map((n) => n.midi))
const HI = Math.max(...MELODY.map((n) => n.midi))

export const loopBar = (bar: number) => ((bar % BARS) + BARS) % BARS
const isEnd = (bar: number) => ENDS.includes(loopBar(bar))
export const nextEnd = (bar: number) => {
  let b = bar
  while (!isEnd(b)) b++
  return b
}


type Kick = { bar: number; beat: number; at: number; launch: number; fill: boolean; whistle: boolean; level: number; kind: ShotKind }

export const barStart = (origin: number, bar: number) => origin + bar * BAR_MS

export const kicksForBar = (bar: number, origin: number, final = false): Kick[] => {
  const end = isEnd(bar)
  const beats = end ? [...KICKS, ...FILLS] : KICKS
  return beats.map((beat, i) => {
    const at = origin + (bar * BAR_BEATS + beat) * BEAT_MS
    const last = end && i === beats.length - 1
    const kind: ShotKind = final && last ? 'big' : last || (beat === 0 && SPRITE_DOWNBEATS.includes(loopBar(bar))) ? (final ? 'shell' : 'sprite') : 'shell'
    return { bar, beat, at, launch: at - RISE_MS, fill: beat > 3.2, whistle: beat < 3.2, level: beat > 3.2 ? 0.8 : 1, kind }
  })
}


export const notesForBar = (bar: number): Note[] => {
  const from = loopBar(bar) * BAR_BEATS
  return MELODY.filter((n) => n.beat >= from && n.beat < from + BAR_BEATS).map((n) => ({ ...n, beat: n.beat - from }))
}

export const twinkleHeight = (midi: number) => 0.62 - ((midi - LO) / (HI - LO)) * 0.42
