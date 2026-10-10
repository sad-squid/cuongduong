import { SPRITES, type Sprite } from './sprites'
import { COLORS } from './tokens'

const SHOW_MS = 15000
const RISE_MS = 900
const MAX = 6000
const GRAVITY = 220
const SHELL_COLORS = [COLORS.warmCoral, COLORS.teal, COLORS.cream, COLORS.dustyRose, '#F7D046', COLORS.coral]

type Rocket = { x: number; y: number; fromY: number; toY: number; start: number; burst: Burst; trail: number }
type Burst = { kind: 'sprite'; sprite: Sprite } | { kind: 'shell'; colors: number[] }

export type FireworksEvents = {
  onBurst: (x: number, y: number, name: string | null) => void
  onEnd: () => void
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
    this.rockets.push({ x, y: this.h + 10, fromY: this.h + 10, toY, start: now, burst, trail: this.colorIndex(COLORS.warmCoral) })
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
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, 500 + Math.random() * 400, this.colorIndex(COLORS.cream), 1.6, now)
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
    const cols = Math.max(...sprite.rows.map((row) => row.length))
    const cell = Math.max(7, Math.min(14, Math.min(this.w, this.h) * 0.022))
    const left = x - (cols * cell) / 2
    const top = y - (sprite.rows.length * cell) / 2
    sprite.rows.forEach((row, ry) => {
      for (let cx = 0; cx < row.length; cx++) {
        const hex = sprite.colors[row[cx]]
        if (!hex) continue
        const i = this.add(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, 0, 0, 0, this.colorIndex(hex), cell * 0.55, now)
        if (i < 0) continue
        this.tx[i] = left + cx * cell
        this.ty[i] = top + ry * cell
        this.forming[i] = 1
        this.release[i] = now + 1900 + Math.random() * 250
      }
    })
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
    c.globalCompositeOperation = 'lighter'
    const buckets = new Map<number, Path2D>()
    for (let i = 0; i < this.n; i++) {
      let fade = 1
      if (this.forming[i]) fade = 0.8 + Math.random() * 0.2
      else fade = Math.max(0, 1 - (now - this.born[i]) / this.life[i])
      const level = Math.min(3, Math.floor(fade * 4))
      if (level <= 0) continue
      const key = this.color[i] * 4 + level
      let path = buckets.get(key)
      if (!path) {
        path = new Path2D()
        buckets.set(key, path)
      }
      const s = this.size[i]
      path.rect(this.x[i] - s / 2, this.y[i] - s / 2, s, s)
    }
    for (const [key, path] of buckets) {
      c.fillStyle = this.palette[key >> 2]
      c.globalAlpha = (key & 3) / 3
      c.fill(path)
    }
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
  }
}
