import { HOLE, SPRITES, type GridSprite, type Sprite } from './sprites'

const SHOW_MS = 15000
const RISE_MS = 900
const MAX = 14000
const GRAVITY = 220
const SHELL_COLORS = ['#F0EEE9', '#DCD7C9', '#C9C4B8', '#9A958B']
const SPRITE_ROWS = 40
const GRAY = ['#45423E', '#6B6761', '#9A958B', '#C9C4B8', '#F0EEE9']

const toGray = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lum = Math.pow(0.2126 * r + 0.7152 * g + 0.0722 * b, 1.8)
  return GRAY[[0.25, 0.45, 0.65, 0.85].filter((t) => lum > t).length]
}

type Rocket = { x: number; y: number; fromY: number; toY: number; start: number; burst: Burst; trail: number }
type Burst = { kind: 'sprite'; sprite: Sprite | GridSprite } | { kind: 'shell'; colors: number[] }

export type FireworksEvents = {
  onBurst: (x: number, y: number, name: string | null) => void
  onEnd: () => void
}

type Sampled = { xs: Float32Array; ys: Float32Array; colors: string[]; ci: Uint8Array; w: number; h: number; pitch: number }

const sampled = new Map<string, Sampled>()
let sampler: CanvasRenderingContext2D | null = null

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

const nearest = (refs: number[][], r: number, g: number, b: number) => {
  let best = 0
  let dist = Infinity
  for (let k = 0; k < refs.length; k++) {
    const m = (refs[k][0] + r) / 2
    const dr = refs[k][0] - r
    const dg = refs[k][1] - g
    const db = refs[k][2] - b
    const d = (2 + m / 256) * dr * dr + 4 * dg * dg + (2 + (255 - m) / 256) * db * db
    if (d < dist) {
      dist = d
      best = k
    }
  }
  return best
}

const LETTERS = 'ABCDEFGHIJKLMNOP'

const sampleGrid = (sprite: GridSprite, height: number): Sampled => {
  const rows = sprite.grid.length
  const cols = sprite.grid[0].length
  const pitch = height / rows
  const xs: number[] = []
  const ys: number[] = []
  const ci: number[] = []
  sprite.grid.forEach((line, r) => {
    for (let q = 0; q < cols; q++) {
      const k = LETTERS.indexOf(line[q])
      if (k < 0) continue
      xs.push((q - cols / 2) * pitch)
      ys.push((r - rows / 2) * pitch)
      ci.push(k)
    }
  })
  const colors = sprite.palette
  return { xs: Float32Array.from(xs), ys: Float32Array.from(ys), colors, ci: Uint8Array.from(ci), w: cols * pitch, h: rows * pitch, pitch }
}

export const sampleSprite = (sprite: Sprite | GridSprite, height: number): Sampled => {
  const key = `${sprite.name}:${Math.round(height)}`
  const hit = sampled.get(key)
  if (hit) return hit
  if ('grid' in sprite) {
    const art = sampleGrid(sprite, height)
    sampled.set(key, art)
    return art
  }
  const scale = height / sprite.h
  const W = Math.ceil(sprite.w * scale)
  const H = Math.ceil(height)
  if (!sampler) sampler = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const colors = sprite.palette.map(toGray)
  const pitch = height / SPRITE_ROWS
  const out: Sampled = { xs: new Float32Array(0), ys: new Float32Array(0), colors, ci: new Uint8Array(0), w: W, h: H, pitch }
  const c = sampler
  if (!c) return out
  c.canvas.width = W
  c.canvas.height = H
  c.setTransform(scale, 0, 0, scale, 0, 0)
  c.clearRect(0, 0, sprite.w, sprite.h)
  sprite.draw(c)
  const data = c.getImageData(0, 0, W, H).data
  const refs = sprite.palette.map(rgb)
  const xs: number[] = []
  const ys: number[] = []
  const ci: number[] = []
  for (let y = pitch / 2; y < H; y += pitch) {
    for (let x = pitch / 2; x < W; x += pitch) {
      const o = (Math.floor(y) * W + Math.floor(x)) * 4
      if (data[o + 3] < 160) continue
      const own = nearest(refs, data[o], data[o + 1], data[o + 2])
      if (sprite.palette[own] === HOLE) continue
      xs.push(x - W / 2)
      ys.push(y - H / 2)
      ci.push(own)
    }
  }
  out.xs = Float32Array.from(xs)
  out.ys = Float32Array.from(ys)
  out.ci = Uint8Array.from(ci)
  sampled.set(key, out)
  return out
}

const shuffle = <T,>(list: T[]) => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export class Fireworks {
  private readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null = null
  private dpr = 1
  private w = 0
  private h = 0
  private palette: string[] = []
  private n = 0
  private x = new Float32Array(MAX)
  private y = new Float32Array(MAX)
  private vx = new Float32Array(MAX)
  private vy = new Float32Array(MAX)
  private tx = new Float32Array(MAX)
  private ty = new Float32Array(MAX)
  private born = new Float32Array(MAX)
  private release = new Float32Array(MAX)
  private life = new Float32Array(MAX)
  private size = new Float32Array(MAX)
  private color = new Uint8Array(MAX)
  private forming = new Uint8Array(MAX)
  private rockets: Rocket[] = []
  private schedule: { at: number; burst: Burst }[] = []
  private start = 0
  private last = 0
  private raf = 0
  private events: FireworksEvents | null = null
  private lowPower = false
  private side = Math.random() < 0.5 ? 1 : -1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  get isRunning() {
    return this.events !== null
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

  play(events: FireworksEvents, lowPower: boolean) {
    if (this.events || !this.ctx) return false
    this.events = events
    this.lowPower = lowPower
    this.n = 0
    this.rockets = []
    this.palette = []
    const sprites = shuffle(SPRITES).slice(0, 6)
    const shell = (): Burst => {
      const a = Math.floor(Math.random() * SHELL_COLORS.length)
      const b = Math.floor(Math.random() * SHELL_COLORS.length)
      return { kind: 'shell', colors: [this.colorIndex(SHELL_COLORS[a]), this.colorIndex(SHELL_COLORS[b])] }
    }
    const plan: [number, Burst | 'sprite'][] = [
      [300, shell()],
      [1300, 'sprite'],
      [2700, shell()],
      [3500, 'sprite'],
      [5000, shell()],
      [5300, shell()],
      [6200, 'sprite'],
      [8000, 'sprite'],
      [9000, shell()],
      [10000, 'sprite'],
      [11800, 'sprite'],
      [12900, shell()],
      [13100, shell()],
      [13300, shell()],
      [13500, shell()],
    ]
    let next = 0
    this.schedule = plan.map(([at, burst]) => ({ at, burst: burst === 'sprite' ? { kind: 'sprite', sprite: sprites[next++ % sprites.length] } : burst }))
    this.start = performance.now()
    this.last = this.start
    this.raf = requestAnimationFrame(this.frame)
    return true
  }

  stop() {
    cancelAnimationFrame(this.raf)
    const events = this.events
    this.events = null
    this.clear()
    events?.onEnd()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.events = null
  }

  private colorIndex(hex: string) {
    const i = this.palette.indexOf(hex)
    if (i >= 0) return i
    this.palette.push(hex)
    return this.palette.length - 1
  }

  private clear() {
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.ctx?.clearRect(0, 0, this.w, this.h)
  }

  private launch(burst: Burst, now: number) {
    let x: number
    let toY: number
    if (burst.kind === 'sprite' && this.w >= 900) {
      this.side = -this.side
      x = this.w * (0.5 + this.side * (0.3 + Math.random() * 0.1))
      toY = this.h * (0.22 + Math.random() * 0.18)
    } else if (burst.kind === 'sprite') {
      x = this.w * (0.4 + Math.random() * 0.2)
      toY = this.h * 0.14
    } else {
      const lastX = this.rockets.length ? this.rockets[this.rockets.length - 1].x : this.w / 2
      x = this.w * (0.18 + Math.random() * 0.64)
      if (Math.abs(x - lastX) < this.w * 0.15) x = this.w - x
      toY = this.h * (0.12 + Math.random() * 0.2)
    }
    this.rockets.push({ x, y: this.h + 10, fromY: this.h + 10, toY, start: now, burst, trail: this.colorIndex('#9A958B') })
  }

  private spriteHeight() {
    return this.w >= 900 ? Math.min(260, this.h * 0.28) : Math.min(170, this.w * 0.42, this.h * 0.2)
  }

  private add(x: number, y: number, vx: number, vy: number, life: number, color: number, size: number, now: number) {
    if (this.n >= MAX) return -1
    const i = this.n++
    this.x[i] = x
    this.y[i] = y
    this.vx[i] = vx
    this.vy[i] = vy
    this.life[i] = life
    this.born[i] = now
    this.release[i] = 0
    this.forming[i] = 0
    this.color[i] = color
    this.size[i] = size
    return i
  }

  private burst(rocket: Rocket, now: number) {
    const { x, toY: y, burst } = rocket
    const spark = this.lowPower ? 18 : 36
    for (let k = 0; k < spark; k++) {
      const a = Math.random() * Math.PI * 2
      const v = 60 + Math.random() * 120
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, 500 + Math.random() * 400, this.colorIndex('#F0EEE9'), 1.6, now)
    }
    if (burst.kind === 'shell') {
      const count = this.lowPower ? 50 : 100
      for (let k = 0; k < count; k++) {
        const a = Math.random() * Math.PI * 2
        const v = 130 + Math.random() * 140
        this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, 1200 + Math.random() * 700, burst.colors[k & 1], 2.2, now)
      }
      this.events?.onBurst(x, y, null)
      return
    }
    const { sprite } = burst
    const art = sampleSprite(sprite, this.spriteHeight())
    const colors = art.colors.map((hex) => this.colorIndex(hex))
    for (let k = 0; k < art.xs.length; k++) {
      const i = this.add(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, 0, 0, 0, colors[art.ci[k]], art.pitch * 0.75, now)
      if (i < 0) break
      this.tx[i] = x + art.xs[k]
      this.ty[i] = y + art.ys[k]
      this.forming[i] = 1
      this.release[i] = now + 1900 + Math.random() * 250
    }
    this.events?.onBurst(x, y, sprite.name)
  }

  private frame = (now: number) => {
    const c = this.ctx
    if (!c) return
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const t = now - this.start
    while (this.schedule.length && this.schedule[0].at - RISE_MS <= t) this.launch(this.schedule.shift()!.burst, now)

    this.rockets = this.rockets.filter((rocket) => {
      const p = Math.min(1, (now - rocket.start) / RISE_MS)
      const e = 1 - Math.pow(1 - p, 2.4)
      rocket.y = rocket.fromY + (rocket.toY - rocket.fromY) * e
      this.add(rocket.x + (Math.random() - 0.5) * 2, rocket.y + 4, (Math.random() - 0.5) * 12, 30 + Math.random() * 30, 420, rocket.trail, 1.6, now)
      if (p < 1) return true
      this.burst(rocket, now)
      return false
    })

    for (let i = 0; i < this.n; ) {
      if (this.forming[i]) {
        const age = now - this.born[i]
        if (now < this.release[i]) {
          const p = Math.min(1, age / 450)
          const e = 1 - Math.pow(1 - p, 3)
          this.x[i] += (this.tx[i] - this.x[i]) * (p < 1 ? e * 0.35 : 0.5)
          this.y[i] += (this.ty[i] + age * 0.004 - this.y[i]) * (p < 1 ? e * 0.35 : 0.5)
          i++
          continue
        }
        this.forming[i] = 0
        this.born[i] = now
        this.life[i] = 1300 + Math.random() * 500
        this.vx[i] = (Math.random() - 0.5) * 50
        this.vy[i] = -20 - Math.random() * 40
      }
      const age = now - this.born[i]
      if (age > this.life[i] || this.y[i] > this.h + 20) {
        const last = --this.n
        this.x[i] = this.x[last]
        this.y[i] = this.y[last]
        this.vx[i] = this.vx[last]
        this.vy[i] = this.vy[last]
        this.tx[i] = this.tx[last]
        this.ty[i] = this.ty[last]
        this.born[i] = this.born[last]
        this.release[i] = this.release[last]
        this.life[i] = this.life[last]
        this.size[i] = this.size[last]
        this.color[i] = this.color[last]
        this.forming[i] = this.forming[last]
        continue
      }
      this.vx[i] *= 0.985
      this.vy[i] = this.vy[i] * 0.985 + GRAVITY * dt
      this.x[i] += this.vx[i] * dt
      this.y[i] += this.vy[i] * dt
      i++
    }

    this.paint(now)
    if (t > SHOW_MS && !this.schedule.length && !this.rockets.length && this.n === 0) {
      this.stop()
      return
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private paint(now: number) {
    const c = this.ctx
    if (!c) return
    const d = this.dpr
    c.setTransform(d, 0, 0, d, 0, 0)
    c.globalCompositeOperation = 'destination-out'
    c.globalAlpha = 0.32
    c.fillRect(0, 0, this.w, this.h)
    const held = new Map<number, Path2D>()
    const loose = new Map<number, Path2D>()
    for (let i = 0; i < this.n; i++) {
      const fade = this.forming[i] ? 0.85 + Math.random() * 0.15 : Math.max(0, 1 - (now - this.born[i]) / this.life[i])
      const level = Math.min(3, Math.ceil(fade * 3))
      if (level <= 0) continue
      const key = this.color[i] * 4 + level
      const buckets = this.forming[i] ? held : loose
      let path = buckets.get(key)
      if (!path) {
        path = new Path2D()
        buckets.set(key, path)
      }
      const s = this.size[i]
      path.rect(this.x[i] - s / 2, this.y[i] - s / 2, s, s)
    }
    const fill = (buckets: Map<number, Path2D>) => {
      for (const [key, path] of buckets) {
        c.fillStyle = this.palette[key >> 2]
        c.globalAlpha = (key & 3) / 3
        c.fill(path)
      }
    }
    c.globalCompositeOperation = 'lighter'
    fill(loose)
    c.globalCompositeOperation = 'source-over'
    fill(held)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
  }
}
