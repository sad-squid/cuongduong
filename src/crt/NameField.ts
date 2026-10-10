import { COLORS, DOT, NAME_FONT_STACK, PHYSICS, gaussianStream, jitterTear, type Tear } from './tokens'

export type GenerateResult = { points: number; steps: number; ms: number; seed: number; carried?: boolean }

export type LatticeAnchor = { left: number; top: number; spacing: number }

export type FieldLayout = { align: 'center' | 'left'; inset: number; fontSize: (width: number) => number; weight: number }

const NAME_LAYOUT: FieldLayout = { align: 'center', inset: 0, fontSize: (w) => Math.max(40, Math.min(68, w * 0.11)), weight: 700 }

type FieldCallbacks = {
  onFrame: (t: number) => void
  onStep: (step: number, total: number) => void
  onSettled: (result: GenerateResult) => void
  onPerturbed: (moved: number, seconds: number) => void
}

const STEPS = 28
const MAX_POINTS = 2600

export class NameField {
  private readonly canvas: HTMLCanvasElement
  private readonly callbacks: FieldCallbacks
  private readonly reduceMotion: boolean
  private readonly layout: FieldLayout
  private ctx: CanvasRenderingContext2D | null = null
  private sampler: CanvasRenderingContext2D | null = null
  private dpr = 1
  private w = 0
  private h = 0
  private fontSize = 68
  private n = 0
  private px = new Float32Array(0)
  private py = new Float32Array(0)
  private vx = new Float32Array(0)
  private vy = new Float32Array(0)
  private tx = new Float32Array(0)
  private ty = new Float32Array(0)
  private ex = new Float32Array(0)
  private ey = new Float32Array(0)
  private dim = new Uint8Array(0)
  private box = { x0: 0, y0: 0, x1: 0, y1: 0 }
  private prevBox: [number, number, number, number] | null = null
  private mouseX = -1e4
  private mouseY = -1e4
  private raf = 0
  private running = false
  private diffusing = false
  private first = false
  private anchor: LatticeAnchor | null = null
  private t0 = 0
  private duration = 0
  private sigma = 0
  private seed = 0
  private step = 0
  private peak = 0
  private disturbedAt = 0
  private blasted = false
  private hidden = false
  private ready = false
  private queued: { text: string; apply: (text: string) => void } | null = null
  private tear: Tear | null = null
  private text = ''
  rect: DOMRect | null = null

  constructor(canvas: HTMLCanvasElement, reduceMotion: boolean, callbacks: FieldCallbacks, layout: FieldLayout = NAME_LAYOUT) {
    this.canvas = canvas
    this.reduceMotion = reduceMotion
    this.callbacks = callbacks
    this.layout = layout
  }

  get isDiffusing() {
    return this.diffusing
  }

  get isReady() {
    return this.ready && !this.diffusing && !this.hidden
  }

  queue(text: string, apply: (text: string) => void) {
    this.queued = { text, apply }
  }

  setup() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1)
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr))
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr))
    this.ctx = this.canvas.getContext('2d')
    this.w = r.width
    this.h = r.height
    this.rect = r
    this.prevBox = null
    this.fontSize = this.layout.fontSize(this.w)
    if (this.text) {
      this.retarget(this.text)
      this.snap()
      this.paint(1)
    }
  }

  refreshRect() {
    this.rect = this.canvas.getBoundingClientRect()
  }

  generate(text: string, first: boolean, anchor: LatticeAnchor | null) {
    if (!this.ctx) return
    this.text = text
    this.ready = false
    this.retarget(text)
    if (this.reduceMotion) {
      this.snap()
      this.paint(1)
      this.settle({ points: this.n, steps: 0, ms: 0, seed: 0 })
      return
    }
    this.seed = Math.floor(Math.random() * 0xffff)
    const gauss = gaussianStream(this.seed)
    for (let i = 0; i < this.n; i++) {
      this.ex[i] = gauss()
      this.ey[i] = gauss()
    }
    this.diffusing = true
    this.first = first
    this.anchor = first ? anchor : null
    this.step = 0
    this.t0 = performance.now()
    this.duration = first ? 1100 : 600
    this.sigma = first ? 300 : 46
    this.wake()
  }

  place(text: string) {
    if (!this.ctx) return
    this.text = text
    this.ready = false
    this.retarget(text)
    this.snap()
    this.hidden = true
    this.prevBox = null
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.ctx.clearRect(0, 0, this.w, this.h)
  }

  land(ms: number) {
    this.hidden = false
    this.paint(1)
    this.settle({ points: this.n, steps: 0, ms, seed: 0, carried: true })
  }

  private settle(result: GenerateResult) {
    this.ready = true
    this.callbacks.onSettled(result)
    const queued = this.queued
    this.queued = null
    if (queued && queued.text !== this.text) queued.apply(queued.text)
  }

  pointsInClient() {
    const out: number[] = []
    if (!this.rect || this.hidden) return out
    for (let i = 0; i < this.n; i++) out.push(this.px[i] + this.rect.left, this.py[i] + this.rect.top)
    return out
  }

  ejectPoints(fraction: number) {
    const out: number[] = []
    if (!this.rect || !this.n) return out
    const cx = this.w / 2
    const cy = this.h / 2
    const count = Math.floor(this.n * fraction)
    for (let k = 0; k < count; k++) {
      const i = Math.floor(Math.random() * this.n)
      const dx = this.px[i] - cx
      const dy = this.py[i] - cy
      const d = Math.hypot(dx, dy) || 1
      const speed = 3 + Math.random() * 6
      out.push(
        this.px[i] + this.rect.left,
        this.py[i] + this.rect.top,
        (dx / d) * speed * 1.5 + (Math.random() - 0.5) * 2,
        (dy / d) * speed * 0.8 + (Math.random() - 0.5) * 2,
      )
    }
    return out
  }

  pointer(clientX: number, clientY: number) {
    if (!this.rect || this.reduceMotion) return false
    const x = clientX - this.rect.left
    const y = clientY - this.rect.top
    const R = PHYSICS.radius
    const near = x > this.box.x0 - R && x < this.box.x1 + R && y > this.box.y0 - R && y < this.box.y1 + R
    if (near || this.mouseX > -1e3) {
      this.mouseX = near ? x : -1e4
      this.mouseY = near ? y : -1e4
      this.wake()
    }
    return near
  }

  clearPointer() {
    this.mouseX = -1e4
    this.mouseY = -1e4
    this.wake()
  }

  impulse(clientX: number, clientY: number, radius: number, strength: number) {
    if (!this.rect || this.diffusing || this.reduceMotion) return 0
    const lx = clientX - this.rect.left
    const ly = clientY - this.rect.top
    const r2 = radius * radius
    let moved = 0
    for (let i = 0; i < this.n; i++) {
      const dx = this.px[i] - lx
      const dy = this.py[i] - ly
      const d2 = dx * dx + dy * dy
      if (d2 < r2 && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const f = Math.pow(1 - d / radius, 2) * strength
        this.vx[i] += (dx / d) * f
        this.vy[i] += (dy / d) * f * 0.7
        moved++
      }
    }
    if (moved) {
      this.blasted = true
      this.wake()
    }
    return moved
  }

  setTear(tear: Tear | null) {
    this.tear = tear
    if (tear) this.wake()
  }

  targetsInClient() {
    const out: number[] = []
    if (!this.rect || this.diffusing) return out
    for (let i = 0; i < this.n; i++) out.push(this.tx[i] + this.rect.left, this.ty[i] + this.rect.top)
    return out
  }

  tearBandsNearText() {
    if (!this.rect) return null
    return { center: this.rect.top + (this.box.y0 + this.box.y1) / 2, spread: 60 }
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.running = false
    this.queued = null
  }

  private sample(text: string) {
    const W = Math.ceil(this.w)
    const H = Math.ceil(this.h)
    if (!this.sampler) this.sampler = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const x = this.sampler
    if (!x) return []
    const font = `${this.layout.weight} ${this.fontSize}px ${NAME_FONT_STACK}`
    const left = this.layout.align === 'left'
    x.font = font
    const ox = left ? Math.max(0, this.layout.inset - 12) : Math.floor((W - Math.min(W, Math.ceil(x.measureText(text).width) + 24)) / 2)
    const sw = Math.min(W - ox, Math.ceil(x.measureText(text).width) + 24)
    const sh = Math.min(H, Math.ceil(this.fontSize * 1.8))
    const oy = Math.floor((H - sh) / 2)
    if (x.canvas.width !== sw || x.canvas.height !== sh) {
      x.canvas.width = sw
      x.canvas.height = sh
    }
    x.clearRect(0, 0, sw, sh)
    x.font = font
    x.textAlign = left ? 'left' : 'center'
    x.textBaseline = 'middle'
    x.fillStyle = '#fff'
    x.fillText(text, (left ? this.layout.inset : W / 2) - ox, H / 2 - oy)
    const data = x.getImageData(0, 0, sw, sh).data
    const pts: number[] = []
    for (let y = oy + (oy & 1); y < oy + sh; y += 2) {
      for (let i = ox + (ox & 1); i < ox + sw; i += 2) {
        if (data[((y - oy) * sw + (i - ox)) * 4 + 3] > 200) pts.push(i, y)
      }
    }
    return pts
  }

  private retarget(text: string) {
    const pts = this.sample(text)
    const m = Math.max(1, pts.length / 2)
    const n = Math.max(1, Math.min(MAX_POINTS, m))
    if (n !== this.n) {
      const px = new Float32Array(n)
      const py = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        px[i] = this.n ? this.px[i % this.n] : Math.random() * this.w
        py[i] = this.n ? this.py[i % this.n] : Math.random() * this.h
      }
      this.px = px
      this.py = py
      this.vx = new Float32Array(n)
      this.vy = new Float32Array(n)
      this.tx = new Float32Array(n)
      this.ty = new Float32Array(n)
      this.ex = new Float32Array(n)
      this.ey = new Float32Array(n)
      this.dim = new Uint8Array(n)
      this.n = n
    }
    const order = new Uint32Array(m)
    for (let i = 0; i < m; i++) order[i] = i
    for (let i = m - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = order[i]
      order[i] = order[j]
      order[j] = t
    }
    let x0 = 1e9
    let y0 = 1e9
    let x1 = -1e9
    let y1 = -1e9
    for (let i = 0; i < this.n; i++) {
      const k = order[i % m]
      const x = pts[k * 2] ?? 0
      const y = pts[k * 2 + 1] ?? 0
      this.tx[i] = x
      this.ty[i] = y
      this.dim[i] = Math.floor(y / 2) & 1
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
    this.box = { x0, y0, x1, y1 }
  }

  private snap() {
    this.px.set(this.tx)
    this.py.set(this.ty)
    this.vx.fill(0)
    this.vy.fill(0)
  }

  private wake() {
    if (this.running || !this.ctx) return
    this.running = true
    this.raf = requestAnimationFrame(this.frame)
  }

  private frame = (t: number) => {
    this.callbacks.onFrame(t)
    const now = performance.now()
    const tearing = !!this.tear && now < this.tear.until
    if (this.tear && !tearing) this.tear = null
    if (this.diffusing) {
      this.diffuseStep(t)
      this.raf = requestAnimationFrame(this.frame)
      return
    }
    const { radius: R, force: F, spring: K, damp: D } = PHYSICS
    const R2 = R * R
    const mx = this.mouseX
    const my = this.mouseY
    let energy = 0
    let moved = 0
    let maxV = 0
    for (let i = 0; i < this.n; i++) {
      let x = this.px[i]
      let y = this.py[i]
      let ax = (this.tx[i] - x) * K
      let ay = (this.ty[i] - y) * K
      const dx = x - mx
      const dy = y - my
      const d2 = dx * dx + dy * dy
      if (d2 < R2 && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const f = (1 - d / R) * F
        ax += (dx / d) * f
        ay += (dy / d) * f
      }
      const vx = (this.vx[i] + ax) * D
      const vy = (this.vy[i] + ay) * D
      this.vx[i] = vx
      this.vy[i] = vy
      x += vx
      y += vy
      this.px[i] = x
      this.py[i] = y
      maxV = Math.max(maxV, Math.abs(vx) + Math.abs(vy))
      const e = Math.abs(this.tx[i] - x) + Math.abs(this.ty[i] - y)
      energy = Math.max(energy, e)
      if (e > 1) moved++
    }
    if (moved > this.peak) {
      this.peak = moved
      if (!this.disturbedAt) this.disturbedAt = t
    }
    this.paint(1)
    if (energy < 0.25 && mx < -1e3 && !tearing) {
      if (this.peak > 40 && !this.blasted) this.callbacks.onPerturbed(this.peak, (t - this.disturbedAt) / 1000)
      this.peak = 0
      this.disturbedAt = 0
      this.blasted = false
      this.running = false
      return
    }
    if (maxV < 0.02 && !tearing) {
      this.running = false
      return
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private diffuseStep(t: number) {
    const p = Math.min(1, (t - this.t0) / this.duration)
    const s = Math.pow(1 - p, this.first ? 2.6 : 2.2) * this.sigma
    const grain = s * 0.08
    const anchor = this.anchor
    const rect = this.rect
    const blend = anchor ? Math.min(1, p / 0.45) ** 2 : 1
    for (let i = 0; i < this.n; i++) {
      let x = this.tx[i] + this.ex[i] * s + (Math.random() - 0.5) * grain
      let y = this.ty[i] + this.ey[i] * s * 0.6 + (Math.random() - 0.5) * grain
      if (anchor && rect && blend < 1) {
        const lx = rect.left - anchor.left
        const ly = rect.top - anchor.top
        const G = anchor.spacing
        const qx = Math.floor((x + lx) / G) * G + G / 2 - lx
        const qy = Math.floor((y + ly) / G) * G + G / 2 - ly
        x = qx + (x - qx) * blend
        y = qy + (y - qy) * blend
      }
      this.px[i] = x
      this.py[i] = y
      this.vx[i] = 0
      this.vy[i] = 0
    }
    const step = Math.max(1, Math.ceil(p * STEPS))
    if (step !== this.step) {
      this.step = step
      this.callbacks.onStep(step, STEPS)
    }
    this.paint(this.first ? 0.25 + 0.75 * Math.min(1, p * 1.6) : 1)
    if (p >= 1 || s < 0.5) {
      this.diffusing = false
      this.snap()
      this.peak = 0
      this.disturbedAt = 0
      this.settle({ points: this.n, steps: STEPS, ms: performance.now() - this.t0, seed: this.seed })
    }
  }

  private paint(alpha: number) {
    const c = this.ctx
    if (!c || !this.n || this.hidden) return
    const d = this.dpr
    const tear = this.tear
    if (tear) jitterTear(tear, performance.now())
    const bandOffset = this.rect ? this.rect.top : 0
    const bright = new Path2D()
    const dim = new Path2D()
    const torn = tear ? new Path2D() : null
    let x0 = 1e9
    let y0 = 1e9
    let x1 = -1e9
    let y1 = -1e9
    for (let i = 0; i < this.n; i++) {
      let x = this.px[i]
      const y = this.py[i]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (tear && torn) {
        const band = tear.bands.find((b) => y + bandOffset >= b.y0 && y + bandOffset < b.y1)
        if (band) {
          x += band.dx
          torn.rect(x, y, DOT, DOT)
          continue
        }
      }
      ;(this.dim[i] ? dim : bright).rect(x, y, DOT, DOT)
    }
    const pad = tear ? 30 : 0
    const box: [number, number, number, number] = [x0 - 6 - pad, y0 - 4, x1 + 8 + pad, y1 + 6]
    const prev = this.prevBox ?? box
    const cx0 = Math.max(0, Math.min(box[0], prev[0]))
    const cy0 = Math.max(0, Math.min(box[1], prev[1]))
    const cx1 = Math.min(this.w, Math.max(box[2], prev[2]))
    const cy1 = Math.min(this.h, Math.max(box[3], prev[3]))
    this.prevBox = box
    c.setTransform(d, 0, 0, d, 0, 0)
    c.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0)
    c.fillStyle = COLORS.cream
    c.globalAlpha = alpha
    c.fill(bright)
    c.globalAlpha = alpha * 0.62
    c.fill(dim)
    if (torn) {
      c.globalCompositeOperation = 'lighter'
      c.setTransform(d, 0, 0, d, -2.5 * d, 0)
      c.fillStyle = COLORS.coral
      c.globalAlpha = 0.55
      c.fill(torn)
      c.setTransform(d, 0, 0, d, 2.5 * d, 0)
      c.fillStyle = COLORS.teal
      c.globalAlpha = 0.5
      c.fill(torn)
      c.setTransform(d, 0, 0, d, 0, 0)
      c.fillStyle = COLORS.cream
      c.globalAlpha = 0.9
      c.fill(torn)
      c.globalCompositeOperation = 'source-over'
    }
    c.globalAlpha = 1
  }
}
