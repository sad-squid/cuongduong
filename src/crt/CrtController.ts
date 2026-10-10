import { Lattice, type HitTarget } from './Lattice'
import type { NameField } from './NameField'
import { BLAST, type Tear } from './tokens'

export type CrtEvent =
  | { type: 'activity' }
  | { type: 'pulse'; moved: number; words: number }
  | { type: 'lowPower'; on: boolean }
  | { type: 'reveal'; on: boolean }
  | { type: 'replay' }
  | { type: 'layout' }

type Listener = (event: CrtEvent) => void

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="dialog"], [data-no-blast]'

export class CrtController {
  readonly reduceMotion: boolean
  private lattice: Lattice | null = null
  private field: NameField | null = null
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

  constructor(reduceMotion: boolean) {
    this.reduceMotion = reduceMotion
  }

  get isLowPower() {
    return this.lowPower
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  mount(canvas: HTMLCanvasElement) {
    this.lattice = new Lattice(canvas, this.reduceMotion, this.sampleFrame)
    this.lattice.setup()
    window.addEventListener('pointermove', this.onMove, { passive: true })
    window.addEventListener('pointerdown', this.onDown, { passive: true })
    window.addEventListener('pointerout', this.onOut, { passive: true })
    window.addEventListener('resize', this.onResize)
    window.addEventListener('scroll', this.onScroll, { passive: true })
  }

  unmount() {
    this.lattice?.destroy()
    this.lattice = null
    window.clearTimeout(this.idleTimer)
    window.clearTimeout(this.pulseTimer)
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
    this.lattice?.enable()
    this.scheduleIdleTear()
    this.emit({ type: 'reveal', on: true })
  }

  replay() {
    window.clearTimeout(this.idleTimer)
    this.lattice?.reset()
    this.emit({ type: 'reveal', on: false })
    this.emit({ type: 'replay' })
  }

  frame = (t: number) => this.sampleFrame(t)

  setSnow(on: boolean) {
    this.lattice?.setSnow(on)
  }

  setField(field: NameField | null) {
    this.field = field
    if (!field) this.lattice?.lift(null)
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

  blast(clientX: number, clientY: number) {
    if (this.reduceMotion || !this.lattice) return
    const { radius, strength, sparks } = BLAST
    let moved = this.field?.impulse(clientX, clientY, radius, strength) ?? 0
    moved += this.lattice.impulse(clientX, clientY, radius, strength)
    const count = this.lowPower ? sparks / 2 : sparks
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2
      const speed = 7 + Math.random() * 8
      this.lattice.addSpark(clientX, clientY, Math.cos(a) * speed, Math.sin(a) * speed)
    }
    this.tear(1.2, true)
    this.pulseWords = new Set()
    const now = performance.now()
    if (now - this.lastPulse < 2500) return
    this.lastPulse = now
    window.clearTimeout(this.pulseTimer)
    this.pulseTimer = window.setTimeout(() => this.emit({ type: 'pulse', moved, words: this.pulseWords.size }), 1100)
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

  private sampleFrame = (t: number) => {
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
    this.blast(e.clientX, e.clientY)
  }

  private onOut = (e: PointerEvent) => {
    if (e.relatedTarget) return
    this.lattice?.clearPointer()
    this.field?.clearPointer()
  }

  private onResize = () => {
    this.lattice?.setup()
    this.field?.setup()
    this.liftName()
    this.emit({ type: 'layout' })
  }

  private onScroll = () => {
    this.lattice?.refreshRect()
    this.field?.refreshRect()
  }
}
