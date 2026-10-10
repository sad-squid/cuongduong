import { Lattice, type HitTarget } from './Lattice'
import { Transit } from './Transit'
import { Fireworks } from './Fireworks'
import type { NameField } from './NameField'
import { BLAST, type Tear } from './tokens'
import { createSound } from './Sound'

export type CrtEvent =
  | { type: 'activity' }
  | { type: 'pulse'; moved: number; words: number }
  | { type: 'lowPower'; on: boolean }
  | { type: 'reveal'; on: boolean }
  | { type: 'replay' }
  | { type: 'layout' }
  | { type: 'fireworks'; on: boolean }
  | { type: 'burst'; name: string | null }

type Listener = (event: CrtEvent) => void

const ARRIVAL_POINT = 0.45

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="dialog"], [data-no-blast]'

export class CrtController {
  readonly reduceMotion: boolean
  readonly sound = createSound()
  private lattice: Lattice | null = null
  private field: NameField | null = null
  private transit: Transit | null = null
  private fireworks: Fireworks | null = null
  private handoff: { points: number[]; at: number } | null = null
  private arrivalTimer = 0
  private flightField: NameField | null = null
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
    if (this.revealed) {
      this.lattice.enable()
      this.scheduleIdleTear()
      this.emit({ type: 'reveal', on: true })
    }
    window.addEventListener('pointermove', this.onMove, { passive: true })
    window.addEventListener('pointerdown', this.onDown, { passive: true })
    window.addEventListener('pointerout', this.onOut, { passive: true })
    window.addEventListener('resize', this.onResize)
    window.addEventListener('scroll', this.onScroll, { passive: true })
  }

  unmount() {
    this.lattice?.destroy()
    this.lattice = null
    this.transit?.destroy()
    this.transit = null
    this.fireworks?.destroy()
    this.fireworks = null
    window.clearTimeout(this.idleTimer)
    window.clearTimeout(this.pulseTimer)
    window.clearTimeout(this.arrivalTimer)
    cancelAnimationFrame(this.scrollFrame)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerdown', this.onDown)
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
    window.clearTimeout(this.arrivalTimer)
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
      this.arrivalTimer = window.setTimeout(onArriving, 1100 * ARRIVAL_POINT)
      return
    }
    field.place(text)
    const started = performance.now()
    this.flightField = field
    const duration = transit.fly(handoff.points, field.targetsInClient(), () => {
      this.flightField = null
      field.land(performance.now() - started)
    })
    this.sound.play('flight', { duration: duration / 1000 })
    this.arrivalTimer = window.setTimeout(onArriving, duration * ARRIVAL_POINT)
  }

  get fireworksRunning() {
    return this.fireworks?.isRunning ?? false
  }

  launchFireworks() {
    if (this.reduceMotion || !this.fireworks) return
    const started = this.fireworks.play(
      {
        onLaunch: (x) => this.sound.play('rocket', { pan: this.pan(x), intensity: 0.7 }),
        onBurst: (x, y, name) => {
          this.sound.play(name ? 'sprite' : 'burst', { pan: this.pan(x), intensity: 0.35 })
          this.sound.play('generate', { pan: this.pan(x), duration: name ? 0.55 : 0.4, intensity: name ? 1 : 0.6 + Math.random() * 0.4 })
          this.lattice?.impulse(x, y, 180, 5)
          this.emit({ type: 'burst', name })
        },
        onEnd: () => this.emit({ type: 'fireworks', on: false }),
      },
      this.lowPower,
    )
    if (started) this.emit({ type: 'fireworks', on: true })
  }

  regenerate(field: NameField, text: string) {
    if (!field.isReady) {
      field.queue(text, (next) => this.regenerate(field, next))
      return
    }
    this.ejectFromName()
    field.generate(text, false, null)
    this.sound.play('generate', { duration: 0.9 })
    this.tear(1.6, true, true)
  }

  release(field: NameField) {
    window.clearTimeout(this.arrivalTimer)
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

  tear(strength: number, force = false, silent = false) {
    if (this.reduceMotion) return
    const now = performance.now()
    if (!force && now - this.lastTear < 450) return
    this.lastTear = now
    if (!silent) this.sound.play('tear', { intensity: Math.min(1, strength) })
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

  blast(clientX: number, clientY: number, quiet = false) {
    if (this.reduceMotion || !this.lattice) return
    const compact = window.innerWidth < 720
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
    this.tear(1.2, true, true)
    if (!quiet) this.sound.play('blast', { pan: this.pan(clientX) })
    const now = performance.now()
    if (quiet || now - this.lastPulse < 2500) return
    this.lastPulse = now
    this.pulseWords = new Set()
    window.clearTimeout(this.pulseTimer)
    this.pulseTimer = window.setTimeout(() => this.emit({ type: 'pulse', moved, words: this.pulseWords.size }), 1100)
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
      if (v > 1.8) this.tear(Math.min(1.6, v / 2), false, true)
    }
    this.last = { x: e.clientX, y: e.clientY, t }
  }

  private onDown = (e: PointerEvent) => {
    this.emit({ type: 'activity' })
    const target = e.target as Element | null
    if (target?.closest?.(INTERACTIVE) && !target.closest('[data-blast]')) return
    this.blast(e.clientX, e.clientY)
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
