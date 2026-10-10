import type { MusicBus, SoundApi } from './Sound'
import { HOME_BARS, HOME_BPM, HOME_CHORDS, HOME_ENDS, HOME_HORN, HOME_MELODY } from './homeTune'
import { arcade, chip } from './music'

const SPB = 60 / HOME_BPM
const BAR = 4 * SPB
const AHEAD = 1.5
const TICK_MS = 100
const LEVEL = 0.5
const FADE_IN = 2.5
const FADE_OUT = 1.4

export class HomeMusic {
  private readonly sound: SoundApi
  private bus: MusicBus | null = null
  private origin = 0
  private nextBar = 0
  private wanted = true
  private timer = 0

  constructor(sound: SoundApi) {
    this.sound = sound
  }

  get playing() {
    return this.bus !== null
  }

  get bar() {
    return this.nextBar
  }

  mount() {
    window.clearInterval(this.timer)
    this.timer = window.setInterval(this.tick, TICK_MS)
    document.addEventListener('visibilitychange', this.tick)
  }

  unmount() {
    window.clearInterval(this.timer)
    document.removeEventListener('visibilitychange', this.tick)
    this.release(0.15)
  }

  setWanted(on: boolean) {
    this.wanted = on
    this.tick()
  }

  private release(fade: number) {
    this.bus?.stop(fade)
    this.bus = null
  }

  private tick = () => {
    const clock = this.sound.audioClock()
    const live = this.wanted && this.sound.musicActive && !document.hidden && clock !== null
    if (!live) return this.release(FADE_OUT)
    const now = clock.time
    if (!this.bus) {
      this.bus = this.sound.musicBus(SPB * 0.75, LEVEL, FADE_IN)
      if (!this.bus) return
      this.origin = now + 0.12 - this.nextBar * BAR
    }
    while (this.origin + this.nextBar * BAR - AHEAD <= now) this.scheduleBar(this.nextBar++)
  }

  private scheduleBar(index: number) {
    const bus = this.bus
    if (!bus) return
    const band = bus.band
    const bar = index % HOME_BARS
    const start = this.origin + index * BAR
    const from = bar * 4
    const end = HOME_ENDS.includes(bar)
    for (const n of HOME_MELODY) {
      if (n.beat < from || n.beat >= from + 4) continue
      const dur = Math.min(1.4, Math.max(0.35, n.len * SPB * 1.1))
      const big = end && n.beat === from
      chip(band, start + (n.beat - from) * SPB, n.midi, Math.max(0.18, dur * 0.85), big ? 0.13 : 0.11, 0.25, (Math.random() * 1.4 - 0.7) * 0.4, { echo: true, vibrato: true, cutoff: 3000 })
    }
    arcade(band, start, HOME_CHORDS[bar], BAR, 4, true)
    for (const h of HOME_HORN) {
      if (h.beat < from || h.beat >= from + 4) continue
      chip(band, start + (h.beat - from) * SPB, h.midi + 12, h.len * SPB * 0.9, 0.05, 0.5, -0.2, { cutoff: 900, sustain: 0.85 })
    }
  }
}
