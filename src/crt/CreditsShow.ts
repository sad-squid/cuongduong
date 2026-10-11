import type { Fireworks, Shot } from './Fireworks'
import type { MusicBus, SoundApi } from './Sound'
import { BAR_MS, BEAT_MS, CHORDS, RISE_MS, WHISTLE_LEAD, barStart, kicksForBar, loopBar, nextEnd, notesForBar, twinkleHeight } from './creditsTune'
import { arcade, chip, chipDrum, firework } from './music'

const AHEAD_MS = 1500
const TICK_MS = 100
const LEAD_MS = 1000
const SPB = BEAT_MS / 1000

type ShowTrace = { kicks: number[]; bursts: number[]; audioBars: number[] }

const spread = (w: number) => Math.random() * w * 2 - w

export class CreditsShow {
  readonly trace: ShowTrace | null = import.meta.env.DEV ? { kicks: [], bursts: [], audioBars: [] } : null
  private readonly sound: SoundApi
  private readonly fireworks: Fireworks
  private origin = 0
  private nextBar = 0
  private climaxBar = -1
  private timer = 0
  private music: MusicBus | null = null
  private audioFrom = Infinity
  private src: 'perf' | 'audio' = 'perf'
  private base = 0
  private latency = 0
  private lastShow = 0
  private lastPerf = 0
  private lastAudio = -1
  private bars = new Map<number, Shot[]>()
  private done = false

  constructor(sound: SoundApi, fireworks: Fireworks) {
    this.sound = sound
    this.fireworks = fireworks
    this.lastPerf = performance.now()
    this.base = this.lastPerf
  }

  now = (): number => {
    const perf = performance.now()
    const a = this.sound.audioClock()
    const advancing = a !== null && (this.src === 'audio' || (this.lastAudio >= 0 && a.time > this.lastAudio))
    this.lastAudio = a === null ? -1 : a.time
    let show: number
    if (a !== null && advancing) {
      if (this.src !== 'audio') {
        this.latency = a.latency
        this.base = (a.time - this.latency) * 1000 - (this.lastShow + perf - this.lastPerf)
        this.src = 'audio'
      }
      show = (a.time - this.latency) * 1000 - this.base
    } else {
      if (this.src !== 'perf') {
        this.base = this.lastPerf - this.lastShow
        this.src = 'perf'
      }
      show = perf - this.base
    }
    show = Math.max(show, this.lastShow)
    this.lastShow = show
    this.lastPerf = perf
    return show
  }

  start() {
    this.origin = this.now() + LEAD_MS
    this.tick()
    this.timer = window.setInterval(this.tick, TICK_MS)
    document.addEventListener('visibilitychange', this.tick)
    if (this.trace) (window as unknown as { __creditsShow?: CreditsShow }).__creditsShow = this
  }

  get playing() {
    return this.music !== null
  }

  finale() {
    if (this.climaxBar >= 0 || this.done) return
    const now = this.now()
    let target = nextEnd(Math.max(0, this.nextBar - 1))
    if (target < this.nextBar) {
      const shots = this.bars.get(target) ?? []
      const last = shots.filter((s) => s.kind !== 'twinkle').at(-1)
      if (last && last.at - RISE_MS > now + 30) {
        for (const shot of shots) if (shot.kind === 'sprite') shot.kind = 'shell'
        last.kind = 'big'
        last.x = 0.5
        this.fireworks.enqueue(this.flank(last.at))
      } else target = nextEnd(target + 1)
    }
    this.climaxBar = target
    this.tick()
  }

  stop(fade = 0.15) {
    window.clearInterval(this.timer)
    document.removeEventListener('visibilitychange', this.tick)
    this.done = true
    this.music?.stop(fade)
    this.music = null
  }

  private flank(at: number): Shot[] {
    return [
      { at, kind: 'shell', x: 0.24 },
      { at, kind: 'shell', x: 0.76 },
    ]
  }

  private tick = () => {
    if (this.done) return
    if (!document.hidden) this.sound.wake()
    const now = this.now()
    this.syncAudio()
    if (document.hidden) return
    if (barStart(this.origin, this.nextBar) < now - 100) this.nextBar = Math.floor((now - this.origin) / BAR_MS) + 1
    while (barStart(this.origin, this.nextBar) - AHEAD_MS <= now) this.scheduleBar(this.nextBar++)
  }

  private syncAudio() {
    const live = this.src === 'audio' && this.sound.musicActive && !document.hidden
    if (this.music && !live) {
      this.music.stop(0.08)
      this.music = null
    }
    if (!this.music && live) {
      this.music = this.sound.musicBus(SPB * 0.75)
      this.audioFrom = this.nextBar
    }
  }

  private scheduleBar(bar: number) {
    const final = bar === this.climaxBar
    const start = barStart(this.origin, bar)
    const kicks = kicksForBar(bar, this.origin, final).map((k) => ({ ...k, pan: k.kind === 'big' ? 0 : spread(0.6) }))
    const notes = notesForBar(bar).map((n) => ({ ...n, pan: spread(0.4) }))
    const shots: Shot[] = [
      ...kicks.map((k): Shot => ({ at: k.at, kind: k.kind, x: k.kind === 'sprite' ? undefined : (k.pan + 1) / 2 })),
      ...notes.map((n): Shot => ({ at: start + n.beat * BEAT_MS, kind: 'twinkle', x: (n.pan + 1) / 2, y: twinkleHeight(n.midi) })),
    ]
    if (final) shots.push(...this.flank(kicks[kicks.length - 1].at))
    this.fireworks.enqueue(shots)
    this.bars.set(bar, shots)
    this.bars.delete(bar - 2)
    this.trace?.kicks.push(...kicks.map((k) => k.at))
    const music = this.music
    if (!music || bar < this.audioFrom) return
    this.trace?.audioBars.push(bar)
    const band = music.band
    const floor = band.ctx.currentTime
    const at = (ms: number) => (ms + this.base) / 1000 + this.latency
    const ok = (t: number) => t >= floor
    for (const n of notes) {
      const t = at(start + n.beat * BEAT_MS)
      if (ok(t)) chip(band, t, n.midi, Math.max(0.16, n.len * SPB * 0.85), 0.11, 0.25, n.pan, { echo: true, vibrato: true, cutoff: 3000 })
    }
    if (ok(at(start))) arcade(band, at(start), CHORDS[loopBar(bar)], BAR_MS / 1000, 4)
    for (const k of kicks) {
      const t = at(k.at)
      if (k.whistle && ok(t - WHISTLE_LEAD)) firework(band, t - WHISTLE_LEAD, 'whistle', k.pan, 0.7)
      if (ok(t)) firework(band, t, 'boom', k.pan * 0.66, k.level)
    }
    for (const beat of [1, 3]) if (ok(at(start + beat * BEAT_MS))) chipDrum(band, at(start + beat * BEAT_MS), 'snare')
    for (let k = 0; k < 8; k++) if (ok(at(start + (k / 2) * BEAT_MS))) chipDrum(band, at(start + (k / 2) * BEAT_MS), 'hat')
  }
}
