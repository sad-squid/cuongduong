import { Lattice, type HitTarget } from './Lattice'
import { Transit } from './Transit'
import { Fireworks } from './Fireworks'
import type { NameField } from './NameField'
import { BLAST, type Tear } from './tokens'
import { createSound } from './Sound'
import type { CreditsShow } from './CreditsShow'
import type { HomeMusic } from './HomeMusic'

type Shows = typeof import('./musicShows')

type CrtEvent =
  | { type: 'activity' }
  | { type: 'pulse'; moved: number; words: number }
  | { type: 'lowPower'; on: boolean }
  | { type: 'reveal'; on: boolean }
  | { type: 'replay' }
  | { type: 'layout' }
  | { type: 'fireworks'; on: boolean }
  | { type: 'burst'; name: string | null }
  | { type: 'game'; on: boolean }
  | { type: 'sound' }

type Listener = (event: CrtEvent) => void

const ARRIVAL_POINT = 0.45
const TAP_MS = 500
const TAP_SLOP = 10

const DISPERSE = { duration: 0.9, landing: false } as const
const INTERACTIVE = 'a, button, input, textarea, select, label, [role="dialog"], [data-no-blast]'
const HOLD_SKIP = `${INTERACTIVE}, p, li, dl, h2, h3, input, textarea`
const HOLD_MS = 320

export class CrtController {
  readonly reduceMotion: boolean
  readonly sound = createSound()
  private lattice: Lattice | null = null
  private field: NameField | null = null
  private transit: Transit | null = null
  private fireworks: Fireworks | null = null
  private handoff: { points: number[]; at: number } | null = null
  private arrivalTimers = new Map<NameField, number>()
  private tap: { x: number; y: number; t: number; id: number; silent: boolean } | null = null
  private hold: { x: number; y: number; timer: number; on: boolean } | null = null
  private flightField: NameField | null = null
  private words: HitTarget | null = null
  private suppressHandoff = false
  private scrollFrame = 0
  private listeners = new Set<Listener>()
  private lastTear = -Infinity
  private idleTimer = 0
  private pulseTimer = 0
  private lastPulse = -Infinity
  private pulseWords = new Set<number>()
  private last = { x: 0, y: 0, t: 0 }
  private frameAvg = 16.7
  private frameLast = 0
  private frameSamples = 0
  private lowPower = false
  private revealed = false
  private fireworksPaused = false
  private show: CreditsShow | null = null
  private gaming = false
  private lastTune = false
  private shows: Shows | null = null
  private loading: Promise<Shows> | null = null
  private pendingLaunch = 0
  private home: HomeMusic | null = null
  private homeWanted = true
  private mounted = false

  constructor(reduceMotion: boolean) {
    this.reduceMotion = reduceMotion
  }

  get isRevealed() {
    return this.revealed
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  mount(canvas: HTMLCanvasElement, transitCanvas: HTMLCanvasElement, fireworksCanvas: HTMLCanvasElement) {
    this.lattice = new Lattice(canvas, this.reduceMotion, this.frame)
    this.lattice.setup()
    this.transit = new Transit(transitCanvas)
    this.transit.setup()
    this.fireworks = new Fireworks(fireworksCanvas)
    this.fireworks.setup()
    this.mounted = true
    this.home?.mount()
    if (import.meta.env.DEV) (window as unknown as { __crt?: CrtController }).__crt = this
    if (this.revealed) {
      this.lattice.enable()
      this.scheduleIdleTear()
      this.emit({ type: 'reveal', on: true })
    }
    window.addEventListener('pointermove', this.onMove, { passive: true })
    window.addEventListener('pointerdown', this.onDown, { passive: true })
    window.addEventListener('pointerup', this.onUp, { passive: true })
    window.addEventListener('pointercancel', this.onCancel, { passive: true })
    window.addEventListener('touchstart', this.onTouchStart, { passive: true })
    window.addEventListener('touchmove', this.onTouchMove, { passive: false })
    window.addEventListener('touchend', this.onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', this.onTouchEnd, { passive: true })
    window.addEventListener('pointerout', this.onOut, { passive: true })
    window.addEventListener('resize', this.onResize)
    window.addEventListener('scroll', this.onScroll, { passive: true })
  }

  unmount() {
    this.mounted = false
    this.pendingLaunch++
    this.home?.unmount()
    this.show?.stop()
    this.show = null
    this.lattice?.destroy()
    this.lattice = null
    this.transit?.destroy()
    this.transit = null
    this.fireworks?.destroy()
    this.fireworks = null
    window.clearTimeout(this.idleTimer)
    window.clearTimeout(this.pulseTimer)
    this.arrivalTimers.forEach((timer) => window.clearTimeout(timer))
    this.arrivalTimers.clear()
    cancelAnimationFrame(this.scrollFrame)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onCancel)
    window.removeEventListener('touchstart', this.onTouchStart)
    window.removeEventListener('touchmove', this.onTouchMove)
    window.removeEventListener('touchend', this.onTouchEnd)
    window.removeEventListener('touchcancel', this.onTouchEnd)
    window.removeEventListener('pointerout', this.onOut)
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('scroll', this.onScroll)
  }

  latticeAnchor() {
    return this.lattice?.anchor() ?? null
  }

  reveal() {
    this.revealed = true
    this.lattice?.enable()
    this.scheduleIdleTear()
    this.emit({ type: 'reveal', on: true })
  }

  replay() {
    this.handoff = null
    this.suppressHandoff = true
    window.clearTimeout(this.idleTimer)
    this.lattice?.reset()
    this.revealed = false
    this.emit({ type: 'reveal', on: false })
    this.emit({ type: 'replay' })
  }


  setSnow(on: boolean) {
    this.lattice?.setSnow(on)
  }

  setField(field: NameField | null) {
    this.field = field
    if (!field) this.lattice?.lift(null)
  }

  introduce(field: NameField, text: string, onArriving: () => void = () => {}) {
    const handoff = this.handoff
    this.handoff = null
    this.suppressHandoff = false
    const transit = this.transit
    this.clearArrival(field)
    if (this.flightField) {
      transit?.abort()
      this.flightField = null
    }
    if (this.reduceMotion) {
      field.generate(text, true, null)
      onArriving()
      return
    }
    if (!handoff || !transit || performance.now() - handoff.at > 1500) {
      field.generate(text, true, this.latticeAnchor())
      this.sound.play('generate', { duration: 0.95 })
      this.arriveLater(field, onArriving, 1100 * ARRIVAL_POINT)
      return
    }
    field.place(text)
    const started = performance.now()
    this.flightField = field
    const duration = transit.fly(handoff.points, field.targetsInClient(), () => {
      this.flightField = null
      field.land(performance.now() - started)
    })
    this.sound.play('generate', { duration: duration / 1000, landing: false })
    this.arriveLater(field, onArriving, duration * ARRIVAL_POINT)
  }

  get fireworksRunning() {
    return this.fireworks?.isRunning ?? false
  }

  private loadShows() {
    this.loading ??= import('./musicShows').then((m) => (this.shows = m))
    return this.loading
  }

  launchFireworks(endless = false, tune = false) {
    if (!this.fireworks || this.fireworks.isRunning) return
    const token = ++this.pendingLaunch
    if (tune && !this.shows) {
      this.loadShows()
        .then(() => token === this.pendingLaunch && this.launchFireworks(endless, true))
        .catch(() => token === this.pendingLaunch && this.launchFireworks(endless, false))
      return
    }
    const show = tune && this.shows ? new this.shows.CreditsShow(this.sound, this.fireworks) : null
    const started = this.fireworks.play(
      {
        onLaunch: (x) => this.sound.play('rocket', { pan: this.pan(x), intensity: 0.7 }),
        onBurst: (x, y, name, at) => {
          show?.trace?.bursts.push(at)
          this.sound.play('generate', { ...DISPERSE, pan: this.pan(x) })
          if (!this.reduceMotion) this.lattice?.impulse(x, y, 180, 5)
          this.emit({ type: 'burst', name })
        },
        onEnd: () => {
          show?.stop()
          if (this.show === show) this.show = null
          this.emit({ type: 'fireworks', on: false })
        },
      },
      this.lowPower,
      endless,
      show?.now,
      this.reduceMotion,
    )
    if (!started) return
    this.lastTune = tune
    this.show = show
    show?.start()
    this.emit({ type: 'fireworks', on: true })
  }

  finaleFireworks() {
    this.lastTune = false
    if (this.show) this.show.finale()
    else this.fireworks?.finale()
  }

  stopFireworks() {
    this.pendingLaunch++
    if (this.fireworks?.isRunning) this.fireworks.stop()
  }

  get fireworksHeld() {
    return this.fireworksPaused
  }

  holdFireworks(held: boolean) {
    this.fireworksPaused = held
  }

  toggleFireworks() {
    if (this.fireworks?.isRunning) {
      this.fireworksPaused = true
      this.fireworks.stop()
      return
    }
    this.fireworksPaused = false
    this.launchFireworks(this.lastTune, this.lastTune)
  }

  soundChanged() {
    if (this.sound.musicActive && !this.home)
      void this.loadShows()
        .then((m) => {
          if (this.home) return
          this.home = new m.HomeMusic(this.sound)
          this.home.setWanted(this.homeWanted)
          if (this.mounted) this.home.mount()
        })
        .catch(() => undefined)
    this.emit({ type: 'sound' })
  }

  setHomeMusic(on: boolean) {
    this.homeWanted = on
    this.home?.setWanted(on && !this.gaming)
  }

  setGame(on: boolean) {
    this.gaming = on
    this.home?.setWanted(this.homeWanted && !on)
    this.emit({ type: 'game', on })
  }

  ripple(clientX: number, clientY: number) {
    if (this.reduceMotion) return
    this.lattice?.impulse(clientX, clientY, 140, 5)
  }

  regenerate(field: NameField, text: string) {
    if (!field.isReady) {
      field.queue(text, (next) => this.regenerate(field, next))
      return
    }
    this.ejectFromName()
    field.generate(text, false, null)
    this.sound.play('generate', DISPERSE)
    this.tear(1.6, true)
  }

  release(field: NameField) {
    this.clearArrival(field)
    const inFlight = this.flightField === field
    const points = inFlight ? (this.transit?.abort() ?? []) : field.pointsInClient()
    if (inFlight) this.flightField = null
    if (points.length && !this.suppressHandoff) this.handoff = { points, at: performance.now() }
    if (this.field === field) this.setField(null)
    field.destroy()
  }

  liftName() {
    if (this.field) this.lattice?.lift(this.field.targetsInClient())
  }

  setWordTarget(target: HitTarget | null) {
    this.words = target
    this.lattice?.setHitTarget(
      target
        ? {
            box: target.box,
            test: (x, y) => {
              const word = target.test(x, y)
              if (word !== null) this.pulseWords.add(word)
              return word
            },
          }
        : null,
    )
  }

  ejectFromName() {
    if (!this.field || !this.lattice || this.reduceMotion) return
    const pts = this.field.ejectPoints(this.lowPower ? 0.06 : 0.12)
    for (let i = 0; i < pts.length; i += 4) this.lattice.addSpark(pts[i], pts[i + 1], pts[i + 2], pts[i + 3])
  }

  tear(strength: number, force = false) {
    if (this.reduceMotion) return
    const now = performance.now()
    if (!force && now - this.lastTear < 450) return
    this.lastTear = now
    const anchor = this.field?.tearBandsNearText() ?? { center: window.innerHeight * 0.45, spread: 80 }
    const count = 1 + Math.floor(Math.random() * (strength > 1.2 ? 3 : 2))
    const bands: Tear['bands'] = []
    for (let i = 0; i < count; i++) {
      const height = 4 + Math.random() * 16
      const y0 = anchor.center - anchor.spread + Math.random() * (anchor.spread * 2 - height)
      bands.push({ y0, y1: y0 + height, amp: (5 + Math.random() * 12) * strength, dx: 0 })
    }
    const tear: Tear = { bands, until: now + 160 + Math.random() * 200, nextJitter: 0 }
    this.field?.setTear(tear)
    this.lattice?.setTear(tear)
  }

  blast(clientX: number, clientY: number, quiet = false, silent = false) {
    if (!this.lattice) return
    const compact = window.innerWidth <= 720
    if (this.reduceMotion) {
      const radius = BLAST.radius * (compact ? 0.48 : 0.8)
      this.lattice.flash(clientX, clientY, radius)
      this.words?.dim?.(clientX, clientY, radius * 0.6)
      if (!quiet && !silent) this.sound.play('generate', { ...DISPERSE, pan: this.pan(clientX) })
      return
    }
    const radius = BLAST.radius * (compact ? 0.55 : 1)
    const strength = BLAST.strength * (compact ? 0.8 : 1)
    let moved = this.field?.impulse(clientX, clientY, radius, strength) ?? 0
    moved += this.lattice.impulse(clientX, clientY, radius, strength)
    const count = (this.lowPower ? BLAST.sparks / 2 : BLAST.sparks) * (compact ? 1.4 : 1)
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2
      const speed = compact ? 6 + Math.random() * 11 : 7 + Math.random() * 8
      this.lattice.addSpark(clientX, clientY, Math.cos(a) * speed, Math.sin(a) * speed)
    }
    this.tear(1.2, true)
    if (!quiet && !silent) this.sound.play('generate', { ...DISPERSE, pan: this.pan(clientX) })
    const now = performance.now()
    if (quiet || now - this.lastPulse < 2500) return
    this.lastPulse = now
    this.pulseWords = new Set()
    window.clearTimeout(this.pulseTimer)
    this.pulseTimer = window.setTimeout(() => this.emit({ type: 'pulse', moved, words: this.pulseWords.size }), 1100)
  }

  private arriveLater(field: NameField, onArriving: () => void, ms: number) {
    this.arrivalTimers.set(
      field,
      window.setTimeout(() => {
        this.arrivalTimers.delete(field)
        onArriving()
      }, ms),
    )
  }

  private clearArrival(field: NameField) {
    window.clearTimeout(this.arrivalTimers.get(field))
    this.arrivalTimers.delete(field)
  }

  private pan(clientX: number) {
    return (clientX / Math.max(1, window.innerWidth)) * 1.2 - 0.6
  }

  private emit(event: CrtEvent) {
    for (const listener of this.listeners) listener(event)
  }

  private scheduleIdleTear() {
    window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      if (this.field && !this.field.isDiffusing) this.tear(0.8)
      this.scheduleIdleTear()
    }, 7000 + Math.random() * 7000)
  }

  frame = (t: number) => {
    const dt = t - this.frameLast
    this.frameLast = t
    if (dt <= 0 || dt > 200) return
    this.frameAvg = this.frameAvg * 0.9 + dt * 0.1
    this.frameSamples++
    if (this.frameSamples < 30) return
    const next = this.lowPower ? this.frameAvg > 22 : this.frameAvg > 26
    if (next === this.lowPower) return
    this.lowPower = next
    this.emit({ type: 'lowPower', on: next })
  }

  private onMove = (e: PointerEvent) => {
    this.emit({ type: 'activity' })
    this.lattice?.pointer(e.clientX, e.clientY)
    if (!this.field) return
    const near = this.field.pointer(e.clientX, e.clientY)
    const t = performance.now()
    if (near && !this.field.isDiffusing) {
      const dt = Math.max(1, t - this.last.t)
      const v = Math.hypot(e.clientX - this.last.x, e.clientY - this.last.y) / dt
      if (v > 1.8) this.tear(Math.min(1.6, v / 2))
    }
    this.last = { x: e.clientX, y: e.clientY, t }
  }

  private onDown = (e: PointerEvent) => {
    this.emit({ type: 'activity' })
    const target = e.target as Element | null
    if (target?.closest?.(INTERACTIVE) && !target.closest('[data-blast]')) return
    if (e.pointerType !== 'touch') {
      this.blast(e.clientX, e.clientY, false, !!target?.closest('[data-blast]'))
      return
    }
    this.tap = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, silent: !!target?.closest('[data-blast]') }
  }

  private onUp = (e: PointerEvent) => {
    const tap = this.tap
    this.tap = null
    if (!tap || tap.id !== e.pointerId || performance.now() - tap.t > TAP_MS) return
    if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP) return
    this.blast(e.clientX, e.clientY, false, tap.silent)
  }

  private onCancel = () => {
    this.tap = null
  }

  private onTouchStart = (e: TouchEvent) => {
    this.endHold()
    const touch = e.touches[0]
    const target = e.target as Element | null
    if (e.touches.length !== 1 || !touch || this.reduceMotion) return
    if (target?.closest?.(HOLD_SKIP) && !target.closest('[data-blast]')) return
    const hold = { x: touch.clientX, y: touch.clientY, timer: 0, on: false }
    hold.timer = window.setTimeout(() => {
      hold.on = true
      this.tap = null
      this.press(hold.x, hold.y)
    }, HOLD_MS)
    this.hold = hold
  }

  private onTouchMove = (e: TouchEvent) => {
    const hold = this.hold
    const touch = e.touches[0]
    if (!hold || !touch) return
    if (hold.on) {
      e.preventDefault()
      this.press(touch.clientX, touch.clientY)
      return
    }
    if (Math.hypot(touch.clientX - hold.x, touch.clientY - hold.y) > TAP_SLOP) this.endHold()
  }

  private onTouchEnd = () => {
    this.endHold()
  }

  private press(x: number, y: number) {
    this.emit({ type: 'activity' })
    this.lattice?.pointer(x, y)
    this.field?.pointer(x, y)
  }

  private endHold() {
    const hold = this.hold
    if (!hold) return
    window.clearTimeout(hold.timer)
    this.hold = null
    if (!hold.on) return
    this.lattice?.clearPointer()
    this.field?.clearPointer()
  }

  private onOut = (e: PointerEvent) => {
    if (e.relatedTarget) return
    this.lattice?.clearPointer()
    this.field?.clearPointer()
  }

  private onResize = () => {
    this.transit?.setup()
    this.fireworks?.setup()
    this.lattice?.setup()
    this.field?.setup()
    this.liftName()
    this.emit({ type: 'layout' })
  }

  private onScroll = () => {
    if (this.scrollFrame) return
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0
      this.field?.refreshRect()
      this.emit({ type: 'layout' })
    })
  }
}
