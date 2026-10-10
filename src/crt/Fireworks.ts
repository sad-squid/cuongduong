import { DOT } from './tokens'
import { SPRITES, type GridSprite } from './sprites'
import { RISE_MS, type ShotKind } from './creditsTune'

const SHOW_MS = 15000
const CYCLE_MS = 12000
const CYCLE: [number, 'shell' | 'sprite'][] = [
  [300, 'shell'],
  [1300, 'sprite'],
  [2700, 'shell'],
  [3500, 'sprite'],
  [5000, 'shell'],
  [5300, 'shell'],
  [6200, 'sprite'],
  [8000, 'sprite'],
  [9000, 'shell'],
  [10000, 'sprite'],
  [11800, 'sprite'],
]
const FINALE = [0, 200, 400, 600]
const MAX = 14000
const GRAVITY = 220
const GAP_MS = 250
const STALE_MS = 150
const SHELL_COLORS = ['#F0EEE9', '#DCD7C9', '#C9C4B8', '#9A958B']
type Sampled = { xs: Float32Array; ys: Float32Array; colors: string[]; ci: Uint8Array; pitch: number }

const LETTERS = 'ABCDEFGHIJKLMNOP'
const BASE_ROWS = 40
const HELD = 1
const DUST = 2
const sampled = new Map<string, Sampled>()

export const sampleSprite = (sprite: GridSprite, height: number): Sampled => {
  const key = `${sprite.name}:${Math.round(height)}`
  const hit = sampled.get(key)
  if (hit) return hit
  const rows = sprite.grid.length
  const cols = sprite.grid[0].length
  const pitch = height / BASE_ROWS
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
  const art = { xs: Float32Array.from(xs), ys: Float32Array.from(ys), colors: sprite.palette, ci: Uint8Array.from(ci), pitch }
  sampled.set(key, art)
  return art
}

type Rocket = { x: number; y: number; fromY: number; toY: number; burstAt: number; burst: Burst; trail: number }
type Burst = { kind: 'sprite'; sprite: GridSprite } | { kind: 'shell'; colors: number[]; big: boolean }

export type Shot = { at: number; kind: ShotKind | 'twinkle'; x?: number; y?: number }
type Item = { at: number; launch: number; shot: Shot; burst?: Burst }

export type FireworksEvents = {
  onLaunch: (x: number) => void
  onBurst: (x: number, y: number, name: string | null, at: number) => void
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
  private schedule: Item[] = []
  private clock: () => number = () => performance.now()
  private driven = false
  private frameMs = 16.7
  private start = 0
  private until = SHOW_MS
  private cycles = 0
  private sprites: GridSprite[] = []
  private nextSprite = 0
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

  play(events: FireworksEvents, lowPower: boolean, endless = false, clock?: () => number) {
    if (this.events || !this.ctx) return false
    this.driven = clock !== undefined
    this.clock = clock ?? (() => performance.now())
    this.events = events
    this.lowPower = lowPower
    this.n = 0
    this.rockets = []
    this.palette = []
    this.sprites = endless ? shuffle(SPRITES) : shuffle(SPRITES).slice(0, 6)
    this.nextSprite = 0
    this.cycles = 0
    this.schedule = []
    if (this.driven) {
      this.until = Infinity
    } else if (endless) {
      this.until = Infinity
      this.queueCycle()
    } else {
      this.until = SHOW_MS
      this.queueCycle()
      this.queueFinale(12900)
    }
    this.start = this.driven ? 0 : this.clock()
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
    return true
  }

  finale() {
    if (!this.events || this.until !== Infinity || this.driven) return
    const t = this.clock() - this.start
    this.schedule = this.schedule.filter((item) => item.launch <= t)
    this.queueFinale(t + RISE_MS)
    this.until = t
  }

  enqueue(shots: Shot[]) {
    if (!this.events) return
    for (const shot of shots) this.schedule.push({ at: shot.at, launch: shot.kind === 'twinkle' ? shot.at : shot.at - RISE_MS, shot })
    this.schedule.sort((a, b) => a.launch - b.launch)
  }

  end(at: number) {
    if (this.driven) this.until = at
  }

  private shell(big = false): Burst {
    const a = Math.floor(Math.random() * SHELL_COLORS.length)
    const b = Math.floor(Math.random() * SHELL_COLORS.length)
    return { kind: 'shell', colors: [this.colorIndex(SHELL_COLORS[a]), this.colorIndex(SHELL_COLORS[b])], big }
  }

  private resolve(shot: Shot): Burst {
    if (shot.kind === 'sprite') return { kind: 'sprite', sprite: this.sprites[this.nextSprite++ % this.sprites.length] }
    return this.shell(shot.kind === 'big')
  }

  private push(at: number, kind: ShotKind) {
    const shot: Shot = { at, kind }
    this.schedule.push({ at, launch: at - RISE_MS, shot, burst: this.resolve(shot) })
  }

  private queueCycle() {
    const base = this.cycles * CYCLE_MS
    this.cycles++
    for (const [at, kind] of CYCLE) this.push(base + at, kind)
  }

  private queueFinale(from: number) {
    for (const offset of FINALE) this.push(from + offset, 'shell')
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

  private twinkle(shot: Shot, now: number) {
    const x = this.w * (shot.x ?? 0.5)
    const y = this.h * (shot.y ?? 0.4)
    const count = this.lowPower ? 4 : 8
    const color = this.colorIndex('#DCD7C9')
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2
      const v = 18 + Math.random() * 36
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v - 10, 450 + Math.random() * 350, color, 1.4, now)
    }
  }

  private launch(burst: Burst, burstAt: number, hint?: number) {
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
      x = this.w * (hint ?? 0.18 + Math.random() * 0.64)
      if (hint === undefined && Math.abs(x - lastX) < this.w * 0.15) x = this.w - x
      toY = this.h * (0.12 + Math.random() * 0.2)
    }
    if (burst.kind === 'sprite') {
      const half = (burst.sprite.grid[0].length * this.spriteHeight()) / BASE_ROWS / 2 + 12
      x = Math.min(this.w - half, Math.max(half, x))
    }
    this.events?.onLaunch(x)
    this.rockets.push({ x, y: this.h + 10, fromY: this.h + 10, toY, burstAt, burst, trail: this.colorIndex('#9A958B') })
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

  private burst(rocket: Rocket, now: number, t: number) {
    const { x, toY: y, burst } = rocket
    const spark = this.lowPower ? 18 : 36
    for (let k = 0; k < spark; k++) {
      const a = Math.random() * Math.PI * 2
      const v = 60 + Math.random() * 120
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, 500 + Math.random() * 400, this.colorIndex('#F0EEE9'), 1.6, now)
    }
    if (burst.kind === 'shell') {
      const count = (this.lowPower ? 50 : 100) * (burst.big ? 2.4 : 1)
      const reach = burst.big ? 1.45 : 1
      for (let k = 0; k < count; k++) {
        const a = Math.random() * Math.PI * 2
        const v = (130 + Math.random() * 140) * reach
        this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, (1200 + Math.random() * 700) * reach, burst.colors[k & 1], burst.big ? 2.6 : 2.2, now)
      }
      this.events?.onBurst(x, y, null, t)
      return
    }
    const { sprite } = burst
    const art = sampleSprite(sprite, this.spriteHeight())
    const colors = art.colors.map((hex) => this.colorIndex(hex))
    for (let k = 0; k < art.xs.length; k++) {
      const i = this.add(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, art.xs[k], art.ys[k], 0, colors[art.ci[k]], art.pitch * 0.55, now)
      if (i < 0) break
      this.tx[i] = x + art.xs[k]
      this.ty[i] = y + art.ys[k]
      this.forming[i] = HELD
      this.release[i] = now + 1300 + Math.random() * 200
    }
    this.events?.onBurst(x, y, sprite.name, t)
  }

  private frame = (now: number) => {
    const c = this.ctx
    if (!c) return
    const dt = Math.min(0.05, (now - this.last) / 1000)
    if (!this.driven && now - this.last > GAP_MS) this.start += now - this.last - this.frameMs
    if (now > this.last) this.frameMs = this.frameMs * 0.9 + Math.min(50, now - this.last) * 0.1
    this.last = now
    const t = this.clock() - this.start
    const near = t + this.frameMs / 2
    if (!this.driven && this.until === Infinity && this.schedule.length < 3) this.queueCycle()
    while (this.schedule.length && this.schedule[0].launch <= near) {
      const item = this.schedule.shift()!
      if (this.driven && t - item.at > STALE_MS) continue
      if (item.shot.kind === 'twinkle') this.twinkle(item.shot, now)
      else this.launch(item.burst ?? this.resolve(item.shot), item.at, item.shot.x)
    }

    this.rockets = this.rockets.filter((rocket) => {
      if (this.driven && t - rocket.burstAt > STALE_MS) return false
      const p = Math.min(1, Math.max(0, (t - rocket.burstAt + RISE_MS) / RISE_MS))
      const e = 1 - Math.pow(1 - p, 2.4)
      rocket.y = rocket.fromY + (rocket.toY - rocket.fromY) * e
      this.add(rocket.x + (Math.random() - 0.5) * 2, rocket.y + 4, (Math.random() - 0.5) * 12, 30 + Math.random() * 30, 420, rocket.trail, 1.6, now)
      if (near < rocket.burstAt) return true
      this.burst(rocket, now, t)
      return false
    })

    for (let i = 0; i < this.n; ) {
      if (this.forming[i] === HELD) {
        const age = now - this.born[i]
        if (now < this.release[i]) {
          const p = Math.min(1, age / 450)
          const e = 1 - Math.pow(1 - p, 3)
          this.x[i] += (this.tx[i] - this.x[i]) * (p < 1 ? e * 0.35 : 0.5)
          this.y[i] += (this.ty[i] + age * 0.004 - this.y[i]) * (p < 1 ? e * 0.35 : 0.5)
          i++
          continue
        }
        this.forming[i] = DUST
        this.size[i] = DOT
        this.born[i] = now
        const dist = Math.hypot(this.vx[i], this.vy[i]) || 1
        const speed = 50 + Math.random() * 130
        this.life[i] = 1800 + Math.random() * 800
        this.vx[i] = (this.vx[i] / dist) * speed + (Math.random() - 0.5) * 60
        this.vy[i] = (this.vy[i] / dist) * speed - 40 - Math.random() * 50
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
    if (t > this.until && !this.schedule.length && !this.rockets.length && this.n === 0) {
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
    const dust = new Map<number, Path2D>()
    const loose = new Map<number, Path2D>()
    for (let i = 0; i < this.n; i++) {
      const fade = this.forming[i] === HELD ? 0.85 + Math.random() * 0.15 : Math.max(0, 1 - (now - this.born[i]) / this.life[i])
      const level = Math.min(3, Math.ceil(fade * 3))
      if (level <= 0) continue
      const key = this.color[i] * 4 + level
      const buckets = this.forming[i] === HELD ? held : this.forming[i] === DUST ? dust : loose
      let path = buckets.get(key)
      if (!path) {
        path = new Path2D()
        buckets.set(key, path)
      }
      const s = this.size[i]
      path.rect(this.x[i] - s / 2, this.y[i] - s / 2, s, s)
    }
    const fill = (buckets: Map<number, Path2D>, alpha: number) => {
      for (const [key, path] of buckets) {
        c.fillStyle = this.palette[key >> 2]
        c.globalAlpha = ((key & 3) / 3) * alpha
        c.fill(path)
      }
    }
    c.globalCompositeOperation = 'lighter'
    fill(loose, 1)
    c.globalCompositeOperation = 'source-over'
    fill(dust, 0.6)
    fill(held, 1)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
  }
}
