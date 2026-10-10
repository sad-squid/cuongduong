import { COLORS, DOT } from './tokens'

const STAGGER_MS = 220

export class Transit {
  private readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null = null
  private dpr = 1
  private w = 0
  private h = 0
  private n = 0
  private sx = new Float32Array(0)
  private sy = new Float32Array(0)
  private tx = new Float32Array(0)
  private ty = new Float32Array(0)
  private delay = new Float32Array(0)
  private t0 = 0
  private duration = 0
  private raf = 0
  private done: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  get isFlying() {
    return this.done !== null
  }

  setup() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1)
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr))
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr))
    this.ctx = this.canvas.getContext('2d')
    this.w = r.width
    this.h = r.height
  }

  fly(from: number[], to: number[], onDone: () => void) {
    return this.start(from, to, onDone)
  }

  private start(from: number[], to: number[], onDone: () => void) {
    this.cancel()
    const m = from.length / 2
    const n = to.length / 2
    if (!this.ctx || !m || !n) {
      onDone()
      return 0
    }
    const byX = (pts: number[], count: number) => Array.from({ length: count }, (_, i) => i).sort((a, b) => pts[a * 2] - pts[b * 2])
    const fromOrder = byX(from, m)
    const toOrder = byX(to, n)
    this.n = n
    this.sx = new Float32Array(n)
    this.sy = new Float32Array(n)
    this.tx = new Float32Array(n)
    this.ty = new Float32Array(n)
    this.delay = new Float32Array(n)
    let distance = 0
    for (let rank = 0; rank < n; rank++) {
      const i = toOrder[rank]
      const j = fromOrder[Math.min(m - 1, Math.floor((rank / n) * m))]
      this.sx[rank] = from[j * 2] + (Math.random() - 0.5) * 3
      this.sy[rank] = from[j * 2 + 1] + (Math.random() - 0.5) * 3
      this.tx[rank] = to[i * 2]
      this.ty[rank] = to[i * 2 + 1]
      this.delay[rank] = (rank / n) * STAGGER_MS + Math.random() * 60
      distance = Math.max(distance, Math.hypot(this.tx[rank] - this.sx[rank], this.ty[rank] - this.sy[rank]))
    }
    this.duration = Math.min(1000, 520 + distance * 0.45)
    this.t0 = performance.now()
    this.done = onDone
    this.raf = requestAnimationFrame(this.frame)
    return this.duration + STAGGER_MS
  }

  cancel() {
    cancelAnimationFrame(this.raf)
    const finish = this.done
    this.done = null
    this.clear()
    finish?.()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.done = null
  }

  private clear() {
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.ctx?.clearRect(0, 0, this.w, this.h)
  }

  private frame = (t: number) => {
    const c = this.ctx
    if (!c) return
    const elapsed = t - this.t0
    const calm = new Path2D()
    const fast = new Path2D()
    let finished = true
    for (let i = 0; i < this.n; i++) {
      const p = Math.max(0, Math.min(1, (elapsed - this.delay[i]) / this.duration))
      if (p < 1) finished = false
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      const wobble = Math.sin(p * Math.PI) * 10
      const dx = this.tx[i] - this.sx[i]
      const dy = this.ty[i] - this.sy[i]
      const len = Math.hypot(dx, dy) || 1
      const x = this.sx[i] + dx * e + (-dy / len) * wobble * ((i & 1) * 2 - 1)
      const y = this.sy[i] + dy * e + (dx / len) * wobble * ((i & 1) * 2 - 1)
      ;(p > 0.15 && p < 0.85 ? fast : calm).rect(x, y, DOT, DOT)
    }
    const d = this.dpr
    c.setTransform(d, 0, 0, d, 0, 0)
    c.clearRect(0, 0, this.w, this.h)
    c.fillStyle = COLORS.cream
    c.globalAlpha = 0.95
    c.fill(calm)
    c.globalCompositeOperation = 'lighter'
    c.setTransform(d, 0, 0, d, -2 * d, 0)
    c.fillStyle = COLORS.coral
    c.globalAlpha = 0.5
    c.fill(fast)
    c.setTransform(d, 0, 0, d, 2 * d, 0)
    c.fillStyle = COLORS.teal
    c.globalAlpha = 0.45
    c.fill(fast)
    c.setTransform(d, 0, 0, d, 0, 0)
    c.fillStyle = COLORS.cream
    c.globalAlpha = 0.9
    c.fill(fast)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
    if (finished) {
      const finish = this.done
      this.done = null
      this.clear()
      finish?.()
      return
    }
    this.raf = requestAnimationFrame(this.frame)
  }
}
