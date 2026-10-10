import { COLORS, DOT, PHYSICS, jitterTear, type Tear } from './tokens'

export type HitTarget = {
  box: { left: number; top: number; right: number; bottom: number }
  test: (clientX: number, clientY: number) => number | null
}

const MAX_SPARKS = 600

export class Lattice {
  private readonly canvas: HTMLCanvasElement
  private readonly reduceMotion: boolean
  private readonly onFrame: (t: number) => void
  private ctx: CanvasRenderingContext2D | null = null
  private cache: HTMLCanvasElement | null = null
  private dpr = 1
  private w = 0
  private h = 0
  private spacing = 12
  private cols = 0
  private rows = 0
  private size = 0
  private ox = new Float32Array(0)
  private oy = new Float32Array(0)
  private vx = new Float32Array(0)
  private vy = new Float32Array(0)
  private active = new Uint8Array(0)
  private lifted = new Uint8Array(0)
  private list = new Int32Array(0)
  private activeCount = 0
  private sx = new Float32Array(MAX_SPARKS)
  private sy = new Float32Array(MAX_SPARKS)
  private svx = new Float32Array(MAX_SPARKS)
  private svy = new Float32Array(MAX_SPARKS)
  private life = new Float32Array(MAX_SPARKS)
  private sparkCount = 0
  private mouseX = -1e4
  private mouseY = -1e4
  private running = false
  private raf = 0
  private enabled = false
  private snow = false
  private lastSnow = 0
  private tear: Tear | null = null
  private hitTarget: HitTarget | null = null
  rect: DOMRect | null = null

  constructor(canvas: HTMLCanvasElement, reduceMotion: boolean, onFrame: (t: number) => void) {
    this.canvas = canvas
    this.reduceMotion = reduceMotion
    this.onFrame = onFrame
  }

  get sparks() {
    return this.sparkCount
  }

  get movingDots() {
    return this.activeCount
  }

  get isRunning() {
    return this.running
  }

  anchor() {
    return this.rect ? { left: this.rect.left, top: this.rect.top, spacing: this.spacing } : null
  }

  setup() {
    const r = this.canvas.getBoundingClientRect()
    const d = Math.min(1.5, window.devicePixelRatio || 1)
    this.canvas.width = Math.max(1, Math.round(r.width * d))
    this.canvas.height = Math.max(1, Math.round(r.height * d))
    this.ctx = this.canvas.getContext('2d')
    this.dpr = d
    this.w = r.width
    this.h = r.height
    this.rect = r
    const G = r.width < 720 ? 14 : 12
    const cols = Math.ceil(r.width / G)
    const rows = Math.ceil(r.height / G)
    const size = cols * rows
    this.spacing = G
    this.cols = cols
    this.rows = rows
    if (size !== this.size) {
      this.size = size
      this.ox = new Float32Array(size)
      this.oy = new Float32Array(size)
      this.vx = new Float32Array(size)
      this.vy = new Float32Array(size)
      this.active = new Uint8Array(size)
      this.lifted = new Uint8Array(size)
      this.list = new Int32Array(size)
      this.activeCount = 0
    }
    this.buildCache()
    this.render(false)
  }

  lift(points: number[] | null) {
    if (!this.rect || !this.size) return
    this.lifted.fill(0)
    if (points) {
      const G = this.spacing
      const reach = G
      for (let i = 0; i < points.length; i += 2) {
        const x = points[i] - this.rect.left
        const y = points[i + 1] - this.rect.top
        const col = Math.round((x - G / 2) / G)
        const row = Math.round((y - G / 2) / G)
        if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue
        const dx = x - (col * G + G / 2)
        const dy = y - (row * G + G / 2)
        if (dx * dx + dy * dy < reach * reach) this.lifted[row * this.cols + col] = 1
      }
    }
    this.buildCache()
    this.render(false)
  }

  private buildCache() {
    const cache = this.cache ?? document.createElement('canvas')
    cache.width = this.canvas.width
    cache.height = this.canvas.height
    const lc = cache.getContext('2d')
    if (lc) {
      const G = this.spacing
      lc.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
      lc.clearRect(0, 0, this.w, this.h)
      const even = new Path2D()
      const odd = new Path2D()
      for (let k = 0; k < this.size; k++) {
        if (this.lifted[k]) continue
        const row = (k / this.cols) | 0
        ;(row & 1 ? odd : even).rect((k % this.cols) * G + G / 2, row * G + G / 2, DOT, DOT)
      }
      lc.fillStyle = COLORS.cream
      lc.globalAlpha = 0.17
      lc.fill(even)
      lc.globalAlpha = 0.09
      lc.fill(odd)
    }
    this.cache = cache
  }

  enable() {
    this.enabled = true
  }

  reset() {
    this.sparkCount = 0
    this.ox.fill(0)
    this.oy.fill(0)
    this.vx.fill(0)
    this.vy.fill(0)
    this.active.fill(0)
    this.activeCount = 0
    this.tear = null
    this.render(false)
  }

  setHitTarget(target: HitTarget | null) {
    this.hitTarget = target
  }

  setSnow(on: boolean) {
    this.snow = on
    if (on) this.wake()
    else this.render(false)
  }

  setTear(tear: Tear | null) {
    this.tear = tear
    if (tear) this.wake()
  }

  pointer(clientX: number, clientY: number) {
    if (!this.rect) return
    this.mouseX = clientX - this.rect.left
    this.mouseY = clientY - this.rect.top
    this.wake()
  }

  clearPointer() {
    this.mouseX = -1e4
    this.mouseY = -1e4
    this.wake()
  }

  impulse(clientX: number, clientY: number, radius: number, strength: number) {
    if (!this.rect || !this.ctx) return 0
    const bx = clientX - this.rect.left
    const by = clientY - this.rect.top
    const G = this.spacing
    const r2 = radius * radius
    const c0 = Math.max(0, Math.floor((bx - radius) / G))
    const c1 = Math.min(this.cols - 1, Math.ceil((bx + radius) / G))
    const r0 = Math.max(0, Math.floor((by - radius) / G))
    const r1 = Math.min(this.rows - 1, Math.ceil((by + radius) / G))
    let moved = 0
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const k = r * this.cols + c
        const dx = c * G + G / 2 + this.ox[k] - bx
        const dy = r * G + G / 2 + this.oy[k] - by
        const d2 = dx * dx + dy * dy
        if (d2 < r2 && d2 > 0.01) {
          const d = Math.sqrt(d2)
          const f = Math.pow(1 - d / radius, 2) * strength
          this.vx[k] += (dx / d) * f
          this.vy[k] += (dy / d) * f
          this.activate(k)
          moved++
        }
      }
    }
    this.wake()
    return moved
  }

  addSpark(clientX: number, clientY: number, vx: number, vy: number) {
    if (!this.rect || !this.ctx || this.sparkCount >= MAX_SPARKS) return
    const j = this.sparkCount++
    this.sx[j] = clientX - this.rect.left
    this.sy[j] = clientY - this.rect.top
    this.svx[j] = vx
    this.svy[j] = vy
    this.life[j] = 0
    this.wake()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.running = false
  }

  private activate(k: number) {
    if (this.active[k] || this.lifted[k]) return
    this.active[k] = 1
    this.list[this.activeCount++] = k
  }

  private wake() {
    if (this.running || !this.ctx || !this.enabled || this.reduceMotion) return
    this.running = true
    this.raf = requestAnimationFrame(this.frame)
  }

  private frame = (t: number) => {
    this.running = false
    this.onFrame(t)
    const G = this.spacing
    const cols = this.cols
    const { radius: R, force: F, spring: K, damp: D } = PHYSICS
    const R2 = R * R
    const mx = this.mouseX
    const my = this.mouseY
    const near = mx > -1e3
    if (near) {
      const c0 = Math.max(0, Math.floor((mx - R) / G))
      const c1 = Math.min(cols - 1, Math.ceil((mx + R) / G))
      const r0 = Math.max(0, Math.floor((my - R) / G))
      const r1 = Math.min(this.rows - 1, Math.ceil((my + R) / G))
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.activate(r * cols + c)
    }
    let kept = 0
    let maxV = 0
    for (let a = 0; a < this.activeCount; a++) {
      const k = this.list[a]
      const hx = (k % cols) * G + G / 2
      const hy = ((k / cols) | 0) * G + G / 2
      let ox = this.ox[k]
      let oy = this.oy[k]
      let ax = -ox * K
      let ay = -oy * K
      if (near) {
        const dx = hx + ox - mx
        const dy = hy + oy - my
        const d2 = dx * dx + dy * dy
        if (d2 < R2 && d2 > 0.01) {
          const dd = Math.sqrt(d2)
          const f = (1 - dd / R) * F
          ax += (dx / dd) * f
          ay += (dy / dd) * f
        }
      }
      const vx = (this.vx[k] + ax) * D
      const vy = (this.vy[k] + ay) * D
      ox += vx
      oy += vy
      const speed = Math.abs(vx) + Math.abs(vy)
      if (Math.abs(ox) + Math.abs(oy) < 0.05 && speed < 0.02) {
        this.ox[k] = 0
        this.oy[k] = 0
        this.vx[k] = 0
        this.vy[k] = 0
        this.active[k] = 0
        continue
      }
      maxV = Math.max(maxV, speed)
      this.ox[k] = ox
      this.oy[k] = oy
      this.vx[k] = vx
      this.vy[k] = vy
      this.list[kept++] = k
    }
    this.activeCount = kept
    const snowFrame = this.snow && t - this.lastSnow > 33
    if (snowFrame) this.lastSnow = t
    this.render(true, snowFrame)
    const tearing = !!this.tear && performance.now() < this.tear.until
    if (this.sparkCount > 0 || tearing || maxV >= 0.02 || this.snow) {
      this.running = true
      this.raf = requestAnimationFrame(this.frame)
    }
  }

  private render(step: boolean, snowFrame = false) {
    const c = this.ctx
    if (!c || !this.cache) return
    const G = this.spacing
    const cols = this.cols
    const d = this.dpr
    const even = new Path2D()
    const odd = new Path2D()
    const hot = new Path2D()
    const settling = new Path2D()
    const hide = new Path2D()
    const tear = this.tear && performance.now() < this.tear.until ? this.tear : null
    if (tear) jitterTear(tear, performance.now())
    const top = this.rect ? this.rect.top : 0
    for (let q = 0; q < this.activeCount; q++) {
      const k = this.list[q]
      const row = (k / cols) | 0
      const hx = (k % cols) * G + G / 2
      const hy = row * G + G / 2
      const ox = this.ox[k]
      const oy = this.oy[k]
      hide.rect(hx - 0.6, hy - 0.6, DOT + 1.2, DOT + 1.2)
      const target = Math.abs(ox) + Math.abs(oy) > 1 ? hot : row & 1 ? odd : even
      target.rect(hx + ox, hy + oy, DOT, DOT)
    }
    if (step) this.stepSparks(hot, settling)
    c.setTransform(d, 0, 0, d, 0, 0)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
    c.clearRect(0, 0, this.w, this.h)
    c.drawImage(this.cache, 0, 0, this.w, this.h)
    if (tear) {
      for (const band of tear.bands) {
        const y = Math.max(0, band.y0 - top - 2)
        const bh = Math.min(band.y1 - band.y0 + 4, this.h - y)
        if (bh <= 0) continue
        c.fillStyle = COLORS.bg
        c.fillRect(0, y, this.w, bh)
        c.drawImage(this.cache, 0, y * d, this.cache.width, bh * d, band.dx, y, this.w, bh)
      }
    }
    c.fillStyle = COLORS.bg
    c.fill(hide)
    c.fillStyle = COLORS.cream
    c.globalAlpha = 0.17
    c.fill(even)
    c.globalAlpha = 0.09
    c.fill(odd)
    c.globalAlpha = 0.55
    c.fill(settling)
    if (snowFrame) this.drawSnow(c)
    c.globalCompositeOperation = 'lighter'
    c.setTransform(d, 0, 0, d, -2 * d, 0)
    c.fillStyle = COLORS.coral
    c.globalAlpha = 0.5
    c.fill(hot)
    c.setTransform(d, 0, 0, d, 2 * d, 0)
    c.fillStyle = COLORS.teal
    c.globalAlpha = 0.45
    c.fill(hot)
    c.setTransform(d, 0, 0, d, 0, 0)
    c.fillStyle = COLORS.cream
    c.globalAlpha = this.w <= 720 ? 0.95 : 0.6
    c.fill(hot)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
  }

  private drawSnow(c: CanvasRenderingContext2D) {
    const G = this.spacing
    const flecks = new Path2D()
    const count = Math.floor(this.size * 0.08)
    for (let i = 0; i < count; i++) {
      const k = Math.floor(Math.random() * this.size)
      flecks.rect((k % this.cols) * G + G / 2 + (Math.random() - 0.5) * G, ((k / this.cols) | 0) * G + G / 2, DOT, DOT)
    }
    c.globalAlpha = 0.3
    c.fill(flecks)
  }

  private stepSparks(hot: Path2D, settling: Path2D) {
    const G = this.spacing
    const { radius: R, force: F } = PHYSICS
    const R2 = R * R
    const mx = this.mouseX
    const my = this.mouseY
    const rect = this.rect
    const target = this.hitTarget
    const spark = this.w <= 720 ? DOT * 1.9 : DOT
    for (let k = 0; k < this.sparkCount; ) {
      let x = this.sx[k]
      let y = this.sy[k]
      let vx = this.svx[k]
      let vy = this.svy[k]
      let life = this.life[k]
      const fast = Math.abs(vx) + Math.abs(vy) > 4.5
      const dx = x - mx
      const dy = y - my
      const d2 = dx * dx + dy * dy
      if (d2 < R2 && d2 > 0.01) {
        const dd = Math.sqrt(d2)
        const f = (1 - dd / R) * F
        vx += (dx / dd) * f
        vy += (dy / dd) * f
      }
      if (fast) {
        vx *= 0.95
        vy *= 0.95
      } else {
        const nx = Math.floor(x / G) * G + G / 2
        const ny = Math.floor(y / G) * G + G / 2
        vx = (vx + (nx - x) * 0.08) * 0.8
        vy = (vy + (ny - y) * 0.08) * 0.8
        life++
      }
      x += vx
      y += vy
      let gone = life > 90 || x < -10 || x > this.w + 10 || y < -10 || y > this.h + 10
      if (!gone && fast && target && rect) {
        const cx = x + rect.left
        const cy = y + rect.top
        const b = target.box
        if (cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom) gone = target.test(cx, cy) !== null
      }
      if (gone) {
        const last = --this.sparkCount
        this.sx[k] = this.sx[last]
        this.sy[k] = this.sy[last]
        this.svx[k] = this.svx[last]
        this.svy[k] = this.svy[last]
        this.life[k] = this.life[last]
        continue
      }
      this.sx[k] = x
      this.sy[k] = y
      this.svx[k] = vx
      this.svy[k] = vy
      this.life[k] = life
      if (fast) hot.rect(x - (spark - DOT) / 2, y - (spark - DOT) / 2, spark, spark)
      else settling.rect(x, y, DOT, DOT)
      k++
    }
  }
}
