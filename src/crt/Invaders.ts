import { COLORS } from './tokens'
import { SPRITES, type GridSprite } from './sprites'

const LETTERS = 'ABCDEFGHIJKLMNOP'
const MAX = 9000
const ROWS = 3
const ROW_POINTS = [30, 20, 10]
const START_LIVES = 3
const FORM_MS = 700
const READY_MS = 1000
const NEXT_WAVE_MS = 1400
const INVULNERABLE_MS = 1700
const SHOT_COOLDOWN = 160
const GRAVITY = 160
const SHIP = ['....C....', '...BBB...', '...BBB...', '.BBBBBBB.', 'BBBBBBBBB', 'BBBBBBBBB', 'BB.....BB']

export type InvadersHud = { score: number; wave: number; lives: number }

export type InvadersEvents = {
  onHud: (hud: InvadersHud) => void
  onOver: (score: number) => void
  onHit: (x: number, y: number) => void
}

type Art = { xs: Float32Array; ys: Float32Array; ci: Uint8Array; colors: string[]; w: number; h: number; pitch: number; image: HTMLCanvasElement }

type Shot = { x: number; y: number }

export const shrinkSprite = (sprite: GridSprite) => {
  const rows = sprite.grid.length
  const cols = sprite.grid[0].length
  const out: { r: number; c: number; k: number }[] = []
  for (let r = 0; r < rows; r += 2) {
    for (let c = 0; c < cols; c += 2) {
      const counts = new Map<number, number>()
      for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 2; dc++) {
          const k = LETTERS.indexOf(sprite.grid[r + dr]?.[c + dc] ?? '.')
          if (k >= 0) counts.set(k, (counts.get(k) ?? 0) + 1)
        }
      }
      let best = -1
      let most = 0
      for (const [k, n] of counts) {
        if (n > most) {
          best = k
          most = n
        }
      }
      if (best >= 0) out.push({ r: r / 2, c: c / 2, k: best })
    }
  }
  return { cells: out, rows: Math.ceil(rows / 2), cols: Math.ceil(cols / 2) }
}

const buildArt = (sprite: GridSprite, height: number, dpr: number): Art => {
  const { cells, rows, cols } = shrinkSprite(sprite)
  const pitch = height / rows
  const w = cols * pitch
  const h = rows * pitch
  const image = document.createElement('canvas')
  image.width = Math.max(1, Math.ceil(w * dpr))
  image.height = Math.max(1, Math.ceil(h * dpr))
  const c = image.getContext('2d')
  const size = Math.max(1, pitch * 0.62)
  const xs = new Float32Array(cells.length)
  const ys = new Float32Array(cells.length)
  const ci = new Uint8Array(cells.length)
  cells.forEach(({ r, c: q, k }, i) => {
    xs[i] = q * pitch + pitch / 2 - w / 2
    ys[i] = r * pitch + pitch / 2 - h / 2
    ci[i] = k
    if (!c) return
    c.fillStyle = sprite.palette[k]
    c.fillRect((q * pitch + (pitch - size) / 2) * dpr, (r * pitch + (pitch - size) / 2) * dpr, size * dpr, size * dpr)
  })
  return { xs, ys, ci, colors: sprite.palette, w, h, pitch, image }
}

const shuffle = <T,>(list: T[]) => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export class Invaders {
  private readonly canvas: HTMLCanvasElement
  private readonly events: InvadersEvents
  private ctx: CanvasRenderingContext2D | null = null
  private dpr = 1
  private w = 0
  private h = 0
  private field = 0
  private left = 0
  private size = 30
  private sx = 0
  private sy = 0
  private cols = 6
  private palette: string[] = []
  private sprites: GridSprite[] = []
  private arts: Art[] = []
  private alive = new Uint8Array(0)
  private ox = 0
  private oy = 0
  private dir = 1
  private bob = 0
  private stepClock = 0
  private shipPitch = 2.4
  private shipX = 0
  private shipY = 0
  private shots: Shot[] = []
  private bombs: Shot[] = []
  private lastShot = 0
  private bombClock = 0
  private keys = { left: false, right: false, fire: false }
  private pointer: { active: boolean; x: number } = { active: false, x: 0 }
  private score = 0
  private wave = 1
  private lives = START_LIVES
  private over = false
  private waveStart = 0
  private nextWaveAt = 0
  private invulnerableUntil = 0
  private shipDown = false
  private n = 0
  private px = new Float32Array(MAX)
  private py = new Float32Array(MAX)
  private vx = new Float32Array(MAX)
  private vy = new Float32Array(MAX)
  private born = new Float32Array(MAX)
  private life = new Float32Array(MAX)
  private psize = new Float32Array(MAX)
  private pcolor = new Uint8Array(MAX)
  private raf = 0
  private last = 0
  private running = false

  constructor(canvas: HTMLCanvasElement, events: InvadersEvents) {
    this.canvas = canvas
    this.events = events
  }

  start() {
    if (!this.running) {
      this.running = true
      window.addEventListener('keydown', this.onKeyDown)
      window.addEventListener('keyup', this.onKeyUp)
      window.addEventListener('resize', this.onResize)
      window.addEventListener('blur', this.onBlur)
      document.addEventListener('visibilitychange', this.onVisibility)
      this.canvas.addEventListener('pointerdown', this.onPointerDown)
      this.canvas.addEventListener('pointermove', this.onPointerMove)
      this.canvas.addEventListener('pointerup', this.onPointerUp)
      this.canvas.addEventListener('pointercancel', this.onPointerUp)
      this.setup()
    }
    this.score = 0
    this.wave = 1
    this.lives = START_LIVES
    this.over = false
    this.shipDown = false
    this.invulnerableUntil = 0
    this.n = 0
    this.shipX = this.w / 2
    this.newWave(performance.now())
    this.hud()
    this.resume()
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.raf = 0
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
  }

  private resume() {
    cancelAnimationFrame(this.raf)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  private setup() {
    const r = this.canvas.getBoundingClientRect()
    const prevW = this.w || r.width
    const prevH = this.h || r.height
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr))
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr))
    this.ctx = this.canvas.getContext('2d')
    this.w = r.width
    this.h = r.height
    this.field = Math.min(this.w - 32, 760)
    this.left = (this.w - this.field) / 2
    this.cols = this.w < 520 ? 5 : 6
    this.size = Math.round(Math.max(22, Math.min(40, this.w / 13, this.h / 22)))
    this.sx = Math.min(this.size * 1.9, this.field / (this.cols + 1.2))
    this.sy = this.size * 1.45
    this.shipPitch = this.w < 520 ? 2.2 : 3
    this.shipY = this.h - Math.max(64, this.h * 0.09)
    this.arts = this.sprites.map((sprite) => buildArt(sprite, this.size, this.dpr))
    this.ox *= this.w / prevW
    this.oy *= this.h / prevH
    this.shipX = Math.min(this.left + this.field, Math.max(this.left, (this.shipX * this.w) / prevW))
  }

  private newWave(now: number) {
    this.sprites = shuffle(SPRITES).slice(0, ROWS)
    this.arts = this.sprites.map((sprite) => buildArt(sprite, this.size, this.dpr))
    this.alive = new Uint8Array(ROWS * this.cols).fill(1)
    this.ox = this.left + (this.field - (this.cols - 1) * this.sx) / 2
    this.oy = 96 + Math.min(this.wave - 1, 4) * this.size * 0.35
    this.dir = 1
    this.stepClock = 0
    this.bombClock = 0
    this.shots = []
    this.bombs = []
    this.waveStart = now
    this.nextWaveAt = 0
  }

  private hud() {
    this.events.onHud({ score: this.score, wave: this.wave, lives: this.lives })
  }

  private colorIndex(hex: string) {
    const i = this.palette.indexOf(hex)
    if (i >= 0) return i
    this.palette.push(hex)
    return this.palette.length - 1
  }

  private add(x: number, y: number, vx: number, vy: number, life: number, color: number, size: number, now: number) {
    if (this.n >= MAX) return
    const i = this.n++
    this.px[i] = x
    this.py[i] = y
    this.vx[i] = vx
    this.vy[i] = vy
    this.life[i] = life
    this.born[i] = now
    this.pcolor[i] = color
    this.psize[i] = size
  }

  private invaderAt(index: number) {
    const col = index % this.cols
    const row = Math.floor(index / this.cols)
    return { x: this.ox + col * this.sx, y: this.oy + row * this.sy + this.bob, row }
  }

  private shatter(art: Art, x: number, y: number, now: number) {
    const colors = art.colors.map((hex) => this.colorIndex(hex))
    for (let k = 0; k < art.xs.length; k++) {
      const dx = art.xs[k]
      const dy = art.ys[k]
      const d = Math.hypot(dx, dy) || 1
      const speed = 40 + Math.random() * 140
      this.add(x + dx, y + dy, (dx / d) * speed + (Math.random() - 0.5) * 50, (dy / d) * speed - 30 - Math.random() * 40, 600 + Math.random() * 500, colors[art.ci[k]], Math.max(1.2, art.pitch * 0.62), now)
    }
    const cream = this.colorIndex(COLORS.cream)
    for (let k = 0; k < 14; k++) {
      const a = Math.random() * Math.PI * 2
      const v = 120 + Math.random() * 160
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, 300 + Math.random() * 300, cream, 1.6, now)
    }
  }

  private shipPoints(fn: (x: number, y: number, kind: string) => void) {
    const p = this.shipPitch
    const half = (SHIP[0].length * p) / 2
    SHIP.forEach((line, r) => {
      for (let q = 0; q < line.length; q++) {
        if (line[q] !== '.') fn(this.shipX - half + q * p + p / 2, this.shipY + r * p, line[q])
      }
    })
  }

  private hitShip(now: number) {
    const cream = this.colorIndex(COLORS.cream)
    const coral = this.colorIndex(COLORS.warmCoral)
    this.shipPoints((x, y) => {
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2
        const v = 60 + Math.random() * 200
        this.add(x, y, Math.cos(a) * v, Math.sin(a) * v - 60, 700 + Math.random() * 600, k ? coral : cream, 1.8, now)
      }
    })
    this.events.onHit(this.shipX, this.shipY)
    this.lives = Math.max(0, this.lives - 1)
    this.bombs = []
    this.hud()
    if (this.lives === 0) {
      this.endGame()
      return
    }
    this.invulnerableUntil = now + INVULNERABLE_MS
  }

  private endGame() {
    if (this.over) return
    this.over = true
    this.shipDown = true
    this.keys = { left: false, right: false, fire: false }
    this.pointer.active = false
    this.events.onOver(this.score)
  }

  private interval() {
    let count = 0
    for (let i = 0; i < this.alive.length; i++) count += this.alive[i]
    const frac = count / this.alive.length
    return Math.max(0.035, (0.05 + 0.5 * frac * frac) * Math.pow(0.86, this.wave - 1))
  }

  private stepFormation() {
    let minX = Infinity
    let maxX = -Infinity
    let bottom = -Infinity
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      const { x, y, row } = this.invaderAt(i)
      const art = this.arts[row]
      minX = Math.min(minX, x - art.w / 2)
      maxX = Math.max(maxX, x + art.w / 2)
      bottom = Math.max(bottom, y + art.h / 2)
    }
    if (minX === Infinity) return
    const dx = Math.max(4, this.field / 90)
    const next = this.dir > 0 ? maxX + dx : minX - dx
    this.bob = this.bob ? 0 : 1
    if (next > this.left + this.field || next < this.left) {
      this.oy += this.size * 0.55
      this.dir = -this.dir
      bottom += this.size * 0.55
    } else {
      this.ox += this.dir * dx
    }
    if (bottom >= this.shipY - 4) {
      this.lives = 1
      this.hitShip(performance.now())
    }
  }

  private dropBomb() {
    const columns: number[] = []
    for (let col = 0; col < this.cols; col++) {
      for (let row = ROWS - 1; row >= 0; row--) {
        if (this.alive[row * this.cols + col]) {
          columns.push(row * this.cols + col)
          break
        }
      }
    }
    if (!columns.length) return
    const near = columns.filter((i) => Math.abs(this.invaderAt(i).x - this.shipX) < this.sx * 1.5)
    const pool = near.length && Math.random() < 0.45 ? near : columns
    const index = pool[Math.floor(Math.random() * pool.length)]
    const { x, y, row } = this.invaderAt(index)
    this.bombs.push({ x, y: y + this.arts[row].h / 2 })
  }

  private update(now: number, dt: number) {
    const sinceWave = now - this.waveStart
    if (this.nextWaveAt && now >= this.nextWaveAt) {
      this.wave++
      this.newWave(now)
      this.hud()
    }
    const playing = !this.over && !this.nextWaveAt
    if (!this.over) {
      const speed = Math.max(300, this.field * 0.6)
      if (this.pointer.active) {
        const delta = this.pointer.x - this.shipX
        const step = Math.min(Math.abs(delta), speed * 1.8 * dt)
        this.shipX += Math.sign(delta) * step
      } else {
        const move = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0)
        this.shipX += move * speed * dt
      }
      this.shipX = Math.min(this.left + this.field, Math.max(this.left, this.shipX))
      if ((this.keys.fire || this.pointer.active) && this.shots.length < 1 && now - this.lastShot > SHOT_COOLDOWN && sinceWave > FORM_MS) {
        this.shots.push({ x: this.shipX, y: this.shipY - 4 })
        this.lastShot = now
      }
    }

    const shotSpeed = Math.max(620, this.h * 0.95)
    this.shots = this.shots.filter((shot) => {
      shot.y -= shotSpeed * dt
      if (shot.y < 40) return false
      for (let i = 0; i < this.alive.length; i++) {
        if (!this.alive[i]) continue
        const { x, y, row } = this.invaderAt(i)
        const art = this.arts[row]
        if (Math.abs(shot.x - x) > art.w / 2 + 1 || Math.abs(shot.y - y) > art.h / 2 + 6) continue
        this.alive[i] = 0
        this.shatter(art, x, y, now)
        this.events.onHit(x, y)
        this.score += ROW_POINTS[row] * this.wave
        this.hud()
        if (!this.alive.some((a) => a === 1)) this.nextWaveAt = now + NEXT_WAVE_MS
        return false
      }
      return true
    })

    if (playing && sinceWave > READY_MS) {
      this.stepClock += dt
      const interval = this.interval()
      if (this.stepClock >= interval) {
        this.stepClock = 0
        this.stepFormation()
      }
      this.bombClock += dt
      const rate = 0.55 + 0.22 * this.wave
      const cap = Math.min(6, 1 + this.wave)
      if (this.bombClock > 1 / rate && this.bombs.length < cap) {
        this.bombClock = Math.random() * 0.3
        this.dropBomb()
      }
    }

    const bombSpeed = this.h * 0.3 * Math.min(1.8, Math.pow(1.07, this.wave - 1))
    const half = (SHIP[0].length * this.shipPitch) / 2
    const shipH = SHIP.length * this.shipPitch
    this.bombs = this.bombs.filter((bomb) => {
      bomb.y += bombSpeed * dt
      if (bomb.y > this.h + 10) return false
      if (this.over || now < this.invulnerableUntil) return true
      if (Math.abs(bomb.x - this.shipX) < half && bomb.y > this.shipY - 2 && bomb.y < this.shipY + shipH) {
        this.hitShip(now)
        return false
      }
      return true
    })

    for (let i = 0; i < this.n; ) {
      const age = now - this.born[i]
      if (age > this.life[i]) {
        const last = --this.n
        this.px[i] = this.px[last]
        this.py[i] = this.py[last]
        this.vx[i] = this.vx[last]
        this.vy[i] = this.vy[last]
        this.born[i] = this.born[last]
        this.life[i] = this.life[last]
        this.psize[i] = this.psize[last]
        this.pcolor[i] = this.pcolor[last]
        continue
      }
      this.vx[i] *= 0.982
      this.vy[i] = this.vy[i] * 0.982 + GRAVITY * dt
      this.px[i] += this.vx[i] * dt
      this.py[i] += this.vy[i] * dt
      i++
    }
  }

  private paint(now: number) {
    const c = this.ctx
    if (!c) return
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.clearRect(0, 0, this.w, this.h)

    const sinceWave = now - this.waveStart
    const form = Math.min(1, sinceWave / FORM_MS)
    const ease = 1 - Math.pow(1 - form, 3)
    c.globalAlpha = ease
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      const { x, y, row } = this.invaderAt(i)
      const art = this.arts[row]
      if (!art) continue
      c.drawImage(art.image, x - art.w / 2, y - art.h / 2 - (1 - ease) * 28, art.w, art.h)
    }
    c.globalAlpha = 1

    const blink = now < this.invulnerableUntil && Math.floor(now / 110) % 2 === 0
    if (!this.shipDown && !blink) {
      const body = new Path2D()
      const tip = new Path2D()
      const s = this.shipPitch * 0.7
      this.shipPoints((x, y, kind) => (kind === 'C' ? tip : body).rect(x - s / 2, y - s / 2, s, s))
      c.fillStyle = COLORS.cream
      c.fill(body)
      c.fillStyle = COLORS.warmCoral
      c.fill(tip)
    }

    const shots = new Path2D()
    for (const shot of this.shots) {
      for (let k = 0; k < 4; k++) shots.rect(shot.x - 1, shot.y + k * 4, 2, 2)
    }
    c.fillStyle = COLORS.cream
    c.fill(shots)

    const bombs = new Path2D()
    for (const bomb of this.bombs) {
      const wiggle = Math.floor((bomb.y + now * 0.05) / 6) % 2 ? 1.5 : -1.5
      for (let k = 0; k < 3; k++) bombs.rect(bomb.x - 1 + (k % 2 ? wiggle : -wiggle), bomb.y - k * 4, 2, 2)
    }
    c.fillStyle = COLORS.beige
    c.globalAlpha = 0.85
    c.fill(bombs)
    c.globalAlpha = 1

    const buckets = new Map<number, Path2D>()
    for (let i = 0; i < this.n; i++) {
      const fade = Math.max(0, 1 - (now - this.born[i]) / this.life[i])
      const level = Math.min(3, Math.ceil(fade * 3))
      if (level <= 0) continue
      const key = this.pcolor[i] * 4 + level
      let path = buckets.get(key)
      if (!path) {
        path = new Path2D()
        buckets.set(key, path)
      }
      const s = this.psize[i]
      path.rect(this.px[i] - s / 2, this.py[i] - s / 2, s, s)
    }
    for (const [key, path] of buckets) {
      c.fillStyle = this.palette[key >> 2]
      c.globalAlpha = (key & 3) / 3
      c.fill(path)
    }
    c.globalAlpha = 1
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.update(now, dt)
    this.paint(now)
    if (!this.over || this.n > 0) {
      this.raf = requestAnimationFrame(this.frame)
      return
    }
    this.raf = 0
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.over || e.metaKey || e.ctrlKey || e.altKey) return
    const key = e.key.toLowerCase()
    if (key === 'arrowleft' || key === 'a') this.keys.left = true
    else if (key === 'arrowright' || key === 'd') this.keys.right = true
    else if (key === ' ' || key === 'arrowup' || key === 'w') this.keys.fire = true
    else return
    e.preventDefault()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (key === 'arrowleft' || key === 'a') this.keys.left = false
    else if (key === 'arrowright' || key === 'd') this.keys.right = false
    else if (key === ' ' || key === 'arrowup' || key === 'w') this.keys.fire = false
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.over) return
    this.canvas.setPointerCapture?.(e.pointerId)
    this.pointer = { active: true, x: e.clientX }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.pointer.active) this.pointer.x = e.clientX
  }

  private onPointerUp = () => {
    this.pointer.active = false
  }

  private onBlur = () => {
    this.keys = { left: false, right: false, fire: false }
    this.pointer.active = false
  }

  private onResize = () => {
    this.setup()
    this.paint(performance.now())
  }

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
      this.onBlur()
      return
    }
    if (this.running && (!this.over || this.n > 0)) this.resume()
  }
}
