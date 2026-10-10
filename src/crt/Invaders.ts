import { COLORS } from './tokens'
import { SPRITES, type GridSprite } from './sprites'
import { PITY_KILLS, POWERS, TIMED_SLOTS, dropChance, pickPower, type PowerType } from './powers'

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
const RAPID_COOLDOWN = 110
const LASER_TICK = 160
const GLITCH_MS = 380
const CAPSULE_SPEED = 72
const GRAVITY = 160
const WING_GAP = 34
const CHAIN_LINKS = 3
const ARC_MS = 450
const LASER_SOUND_MS = 320
const SQUID = [
  '.....XXX.....',
  '....XXXXX....',
  '...XXXXXXX...',
  '..XXXXXXXXX..',
  '..XXXXXXXXX..',
  '.XXXXXXXXXXX.',
  '.XX..XXX..XX.',
  '.X..XXXXX..X.',
  '.XXTXXXXXXXX.',
  '..XXXXXXXXX..',
  '..X.X.X.X.X..',
  '..X.X.X.X.X..',
  '.X..X...X..X.',
]
const SLEEP = [...SQUID.slice(0, 6), '.XXXXXXXXXXX.', '.X..XXXXX..X.', '.XXXXXXXXXXX.', ...SQUID.slice(9)]
const HEAD_ROWS = 10
const TENTACLE_ROW = 10
const INK = '#6B6761'

export type InputKind = 'mouse' | 'touch'

export type InvadersHud = { score: number; wave: number; lives: number }

export type ActivePower = { type: PowerType; left: number }

export type SoundCue = 'shot' | 'laser' | 'kill' | 'boom' | 'hurt' | 'shield' | 'power' | 'glitch' | 'clear' | 'over'

export type InvadersEvents = {
  onHud: (hud: InvadersHud) => void
  onOver: (score: number) => void
  onHit: (x: number, y: number) => void
  onInput: (kind: InputKind) => void
  onShot: () => void
  onLayout: (hintY: number) => void
  onPower: (type: PowerType) => void
  onPowers: (active: ActivePower[]) => void
  onGlitch: () => void
  onSound: (cue: SoundCue, pan: number) => void
}

type Art = { xs: Float32Array; ys: Float32Array; ci: Uint8Array; colors: string[]; w: number; h: number; pitch: number; image: HTMLCanvasElement }

type Shot = { x: number; y: number; vx: number; hanabi: boolean; big: boolean }

type Arc = { xs: number[]; ys: number[]; born: number }

type Capsule = { type: PowerType; x: number; y: number }

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

const typing = (target: EventTarget | null) =>
  target instanceof Element && (target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]') !== null)

export class Invaders {
  private readonly canvas: HTMLCanvasElement
  private readonly events: InvadersEvents
  private readonly reduceMotion: boolean
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
  private bombs: { x: number; y: number }[] = []
  private capsules: Capsule[] = []
  private arcs: Arc[] = []
  private wings = [0, 0]
  private lastShot = 0
  private bombClock = 0
  private keys = { left: false, right: false, fire: false }
  private pointer = { follow: false, firing: false, x: 0, y: 0, id: -1 }
  private input: InputKind = 'mouse'
  private score = 0
  private wave = 1
  private lives = START_LIVES
  private over = false
  private waveStart = 0
  private nextWaveAt = 0
  private invulnerableUntil = 0
  private shipDown = false
  private sway = 0
  private clock = 0
  private powers = new Map<PowerType, number>()
  private hanabiArmed = false
  private killsSinceDrop = 0
  private laserAt = 0
  private laserSoundAt = -Infinity
  private glitchUntil = 0
  private powersSent = 0
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

  constructor(canvas: HTMLCanvasElement, events: InvadersEvents, input: InputKind, reduceMotion: boolean) {
    this.canvas = canvas
    this.events = events
    this.input = input
    this.reduceMotion = reduceMotion
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
    this.powers.clear()
    this.hanabiArmed = false
    this.killsSinceDrop = 0
    this.glitchUntil = 0
    this.capsules = []
    this.arcs = []
    this.shipX = this.w / 2
    this.newWave(performance.now())
    this.hud()
    this.sendPowers(true)
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

  give(type: PowerType) {
    if (this.over) return
    this.apply(type, performance.now())
  }

  drop(type: PowerType) {
    this.capsules.push({ type, x: this.shipX, y: this.shipY - 160 })
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
    this.placeShip()
    this.arts = this.sprites.map((sprite) => buildArt(sprite, this.size, this.dpr))
    this.ox *= this.w / prevW
    this.oy *= this.h / prevH
    this.shipX = Math.min(this.left + this.field, Math.max(this.left, (this.shipX * this.w) / prevW))
  }

  private placeShip() {
    this.shipY = this.input === 'touch' ? this.h - Math.max(150, this.h * 0.2) : this.h - Math.max(64, this.h * 0.09)
    this.events.onLayout(this.top() + (ROWS - 1) * this.sy + this.size + 28)
  }

  private top() {
    return 96 + Math.min(this.wave - 1, 4) * this.size * 0.35
  }

  private setInput(kind: InputKind) {
    if (kind === this.input) return
    this.input = kind
    this.placeShip()
    this.events.onInput(kind)
  }

  private newWave(now: number) {
    this.sprites = shuffle(SPRITES).slice(0, ROWS)
    this.arts = this.sprites.map((sprite) => buildArt(sprite, this.size, this.dpr))
    this.alive = new Uint8Array(ROWS * this.cols).fill(1)
    this.ox = this.left + (this.field - (this.cols - 1) * this.sx) / 2
    this.oy = this.top()
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

  private cue(cue: SoundCue, x = this.shipX) {
    this.events.onSound(cue, this.w ? (x / this.w) * 1.2 - 0.6 : 0)
  }

  private has(type: PowerType) {
    return this.powers.has(type)
  }

  private sendPowers(force = false) {
    if (!force && this.clock - this.powersSent < 100) return
    this.powersSent = this.clock
    const active: ActivePower[] = [...this.powers].map(([type, until]) => ({ type, left: Math.max(0, Math.min(1, (until - this.clock) / POWERS[type].ms)) }))
    if (this.hanabiArmed) active.push({ type: 'hanabi', left: 1 })
    this.events.onPowers(active)
  }

  private apply(type: PowerType, now: number) {
    this.events.onPower(type)
    this.cue(type === 'glitch' ? 'glitch' : 'power')
    if (type === 'hanabi') {
      this.hanabiArmed = true
    } else if (type === 'glitch') {
      this.glitch()
    } else {
      if (!this.powers.has(type) && this.powers.size >= TIMED_SLOTS) {
        let oldest: PowerType | null = null
        for (const [kind, until] of this.powers) if (!oldest || until < (this.powers.get(oldest) ?? 0)) oldest = kind
        if (oldest) this.powers.delete(oldest)
      }
      if (type === 'wingmen' && !this.powers.has('wingmen')) this.wings = [this.shipX - this.w * 0.6, this.shipX + this.w * 0.6]
      this.powers.set(type, this.clock + POWERS[type].ms)
    }
    const cream = this.colorIndex(COLORS.cream)
    const tint = this.colorIndex(POWERS[type].tint)
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2
      const v = 90 + Math.random() * 60
      this.add(this.shipX, this.shipY, Math.cos(a) * v, Math.sin(a) * v - 40, 500 + Math.random() * 300, k % 3 ? tint : cream, 1.8, now)
    }
    this.sendPowers(true)
  }

  private glitch() {
    this.oy = Math.max(this.top(), this.oy - this.sy * 2)
    const used = new Set(this.sprites.map((sprite) => sprite.name))
    const fresh = shuffle(SPRITES.filter((sprite) => !used.has(sprite.name)))
    this.sprites = shuffle([...fresh, ...this.sprites]).slice(0, ROWS)
    this.arts = this.sprites.map((sprite) => buildArt(sprite, this.size, this.dpr))
    this.glitchUntil = this.clock + GLITCH_MS
    this.events.onGlitch()
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

  private invaderHit(x: number, y: number) {
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      const at = this.invaderAt(i)
      const art = this.arts[at.row]
      if (Math.abs(x - at.x) <= art.w / 2 + 1 && Math.abs(y - at.y) <= art.h / 2 + 6) return i
    }
    return -1
  }

  private kill(index: number, now: number) {
    const { x, y, row } = this.invaderAt(index)
    const art = this.arts[row]
    this.alive[index] = 0
    this.shatter(art, x, y, now)
    this.events.onHit(x, y)
    this.cue('kill', x)
    this.score += ROW_POINTS[row] * this.wave
    this.hud()
    this.killsSinceDrop++
    if (this.killsSinceDrop >= PITY_KILLS || Math.random() < dropChance(this.wave)) {
      this.killsSinceDrop = 0
      this.capsules.push({ type: pickPower(), x, y })
    }
    if (!this.alive.some((a) => a === 1)) {
      this.nextWaveAt = now + NEXT_WAVE_MS
      this.cue('clear', x)
    }
  }

  private strike(index: number, now: number) {
    const from = this.invaderAt(index)
    this.kill(index, now)
    if (!this.has('chain')) return
    const near: { i: number; d: number }[] = []
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      const at = this.invaderAt(i)
      near.push({ i, d: Math.hypot(at.x - from.x, at.y - from.y) })
    }
    near.sort((a, b) => a.d - b.d)
    for (const { i } of near.slice(0, CHAIN_LINKS)) {
      const to = this.invaderAt(i)
      this.arcs.push(this.arc(from.x, from.y, to.x, to.y, now))
      this.kill(i, now)
    }
  }

  private arc(x0: number, y0: number, x1: number, y1: number, now: number): Arc {
    const length = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(2, Math.round(length / 4))
    const nx = -(y1 - y0) / (length || 1)
    const ny = (x1 - x0) / (length || 1)
    const xs: number[] = []
    const ys: number[] = []
    let drift = 0
    for (let k = 0; k <= steps; k++) {
      const t = k / steps
      drift += (Math.random() - 0.5) * 5
      const bend = Math.sin(t * Math.PI) * drift
      xs.push(x0 + (x1 - x0) * t + nx * bend)
      ys.push(y0 + (y1 - y0) * t + ny * bend)
    }
    return { xs, ys, born: now }
  }

  private hanabiAt(x: number, y: number, now: number) {
    const radius = this.sx * 1.7
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      const at = this.invaderAt(i)
      if (Math.hypot(at.x - x, at.y - y) <= radius) this.kill(i, now)
    }
    const colors = [COLORS.cream, COLORS.beige, '#C9C4B8', COLORS.warmCoral].map((hex) => this.colorIndex(hex))
    for (let k = 0; k < 160; k++) {
      const a = Math.random() * Math.PI * 2
      const v = 120 + Math.random() * 200
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, 900 + Math.random() * 700, colors[k % 4], k % 4 === 3 ? 2.2 : 1.8, now)
    }
    this.events.onHit(x, y)
    this.cue('boom', x)
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

  private squidPoints(grid: string[], cx: number, top: number, p: number, sway: number, fn: (x: number, y: number, kind: string) => void) {
    const half = (grid[0].length * p) / 2
    grid.forEach((line, r) => {
      const shift = r >= TENTACLE_ROW ? Math.sin(this.clock / 90 + r * 1.3) * sway * p * 0.6 : 0
      for (let q = 0; q < line.length; q++) {
        if (line[q] !== '.') fn(cx - half + q * p + p / 2 + shift, top + r * p, line[q])
      }
    })
  }

  private shipPoints(fn: (x: number, y: number, kind: string) => void) {
    this.squidPoints(SQUID, this.shipX, this.shipY, this.shipPitch, 0, fn)
  }

  private shipBox() {
    const p = this.shipPitch
    return { half: 4.5 * p, top: this.shipY, bottom: this.shipY + HEAD_ROWS * p }
  }

  private dropTear(now: number) {
    const p = this.shipPitch
    const x = this.shipX - (SQUID[0].length * p) / 2 + 3 * p + p / 2
    const coral = this.colorIndex(COLORS.warmCoral)
    this.add(x, this.shipY + 8 * p, (Math.random() - 0.5) * 10, 40, 1400, coral, p * 0.8, now)
  }

  private hitShip(now: number) {
    if (this.has('shield')) {
      this.powers.delete('shield')
      this.invulnerableUntil = now + 500
      this.cue('shield')
      const cream = this.colorIndex(COLORS.cream)
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * Math.PI * 2
        this.add(this.shipX + Math.cos(a) * 18, this.shipY + 10 + Math.sin(a) * 18, Math.cos(a) * 160, Math.sin(a) * 160, 500, cream, 1.8, now)
      }
      this.sendPowers(true)
      return
    }
    const cream = this.colorIndex(COLORS.cream)
    const ink = this.colorIndex(INK)
    this.shipPoints((x, y) => {
      const a = Math.random() * Math.PI * 2
      const v = 60 + Math.random() * 180
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v - 60, 600 + Math.random() * 500, Math.random() < 0.6 ? cream : ink, 1.8, now)
    })
    this.dropTear(now)
    this.events.onHit(this.shipX, this.shipY)
    this.lives = Math.max(0, this.lives - 1)
    this.cue('hurt')
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
    this.pointer.firing = false
    this.pointer.follow = this.input === 'mouse'
    this.powers.clear()
    this.hanabiArmed = false
    this.capsules = []
    this.sendPowers(true)
    this.cue('over')
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
      this.powers.delete('shield')
      this.powers.delete('wow')
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

  private fire(now: number, sinceWave: number) {
    const firing = this.keys.fire || this.pointer.firing
    if (!firing || sinceWave < FORM_MS) return
    if (this.has('laser')) {
      if (this.clock - this.laserAt < LASER_TICK) return
      this.laserAt = this.clock
      if (this.clock - this.laserSoundAt >= LASER_SOUND_MS) {
        this.laserSoundAt = this.clock
        this.cue('laser')
      }
      const hits: number[] = []
      for (let i = 0; i < this.alive.length; i++) {
        if (!this.alive[i]) continue
        const at = this.invaderAt(i)
        if (Math.abs(at.x - this.shipX) <= this.arts[at.row].w / 2) hits.push(i)
      }
      hits.sort((a, b) => this.invaderAt(b).y - this.invaderAt(a).y)
      const first = hits.length ? this.invaderAt(hits[0]) : null
      for (const i of hits) if (this.alive[i]) this.strike(i, now)
      if (first && this.hanabiArmed) {
        this.hanabiArmed = false
        this.hanabiAt(first.x, first.y, now)
        this.sendPowers(true)
      }
      this.events.onShot()
      return
    }
    const rapid = this.has('rapid')
    const wingmen = this.has('wingmen')
    const volley = (this.has('spread') ? 3 : 1) + (wingmen ? 2 : 0)
    const max = (rapid ? 6 : 1) * volley
    if (this.shots.length + volley > max || now - this.lastShot < (rapid ? RAPID_COOLDOWN : SHOT_COOLDOWN)) return
    const speed = this.shotSpeed()
    const hanabi = this.hanabiArmed
    this.hanabiArmed = false
    const big = this.has('big')
    const spread = this.has('spread') ? [-0.2, 0, 0.2] : [0]
    spread.forEach((k, i) => this.shots.push({ x: this.shipX, y: this.shipY - 4, vx: k * speed, hanabi: hanabi && i === Math.floor(spread.length / 2), big }))
    if (wingmen) for (const x of this.wings) this.shots.push({ x, y: this.shipY + 4 * this.shipPitch, vx: 0, hanabi: false, big })
    this.lastShot = now
    this.cue('shot')
    if (hanabi) this.sendPowers(true)
    this.events.onShot()
  }

  private shotSpeed() {
    return Math.max(620, this.h * 0.95)
  }

  private update(now: number, dt: number) {
    const sinceWave = now - this.waveStart
    if (this.nextWaveAt && now >= this.nextWaveAt) {
      this.wave++
      this.newWave(now)
      this.hud()
    }
    for (const [type, until] of this.powers) {
      if (this.clock >= until) {
        this.powers.delete(type)
        this.sendPowers(true)
      }
    }
    if (this.powers.size) this.sendPowers()
    const playing = !this.over && !this.nextWaveAt
    if (!this.over) {
      const before = this.shipX
      const speed = Math.max(300, this.field * 0.6)
      if (this.pointer.follow) {
        const delta = this.pointer.x - this.shipX
        const step = Math.min(Math.abs(delta), Math.abs(delta) * Math.min(1, dt * 18), speed * 2.4 * dt)
        this.shipX += Math.sign(delta) * step
      } else {
        const move = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0)
        this.shipX += move * speed * dt
      }
      this.shipX = Math.min(this.left + this.field, Math.max(this.left, this.shipX))
      const moving = dt > 0 ? Math.min(1, Math.abs(this.shipX - before) / dt / 220) : 0
      this.sway += (moving - this.sway) * Math.min(1, dt * 8)
      const lag = Math.min(1, dt * 7)
      this.wings[0] += (this.shipX - WING_GAP - this.wings[0]) * lag
      this.wings[1] += (this.shipX + WING_GAP - this.wings[1]) * lag
      this.fire(now, sinceWave)
      if (this.has('wow') && !this.reduceMotion) {
        const tint = this.colorIndex(Math.random() < 0.5 ? COLORS.warmCoral : COLORS.cream)
        const a = Math.random() * Math.PI * 2
        this.add(this.shipX + Math.cos(a) * 16, this.shipY + 10 + Math.sin(a) * 12, Math.cos(a) * 30, -40 - Math.random() * 40, 420, tint, 1.6, now)
      }
    }

    const shotSpeed = this.shotSpeed()
    const homing = this.has('homing')
    this.shots = this.shots.filter((shot) => {
      if (homing) {
        let best = -1
        let bestD = Infinity
        for (let i = 0; i < this.alive.length; i++) {
          if (!this.alive[i]) continue
          const at = this.invaderAt(i)
          if (at.y > shot.y) continue
          const d = Math.hypot(at.x - shot.x, at.y - shot.y)
          if (d < bestD) {
            bestD = d
            best = i
          }
        }
        if (best >= 0) {
          const at = this.invaderAt(best)
          const want = ((at.x - shot.x) / Math.max(40, shot.y - at.y)) * shotSpeed
          shot.vx += (want - shot.vx) * Math.min(1, dt * 8)
        }
      }
      shot.x += shot.vx * dt
      shot.y -= shotSpeed * dt
      if (shot.y < 40 || shot.x < this.left - 40 || shot.x > this.left + this.field + 40) {
        if (shot.hanabi) this.hanabiAt(shot.x, Math.max(shot.y, 60), now)
        return false
      }
      if (shot.big) {
        const dust = this.colorIndex(Math.random() < 0.25 ? COLORS.warmCoral : COLORS.beige)
        for (let k = 0; k < 2; k++) this.add(shot.x + (Math.random() - 0.5) * 12, shot.y + 10, (Math.random() - 0.5) * 60, 20 + Math.random() * 40, 420 + Math.random() * 300, dust, 1.6, now)
        for (const dx of [-7, 0, 7]) {
          for (const dy of [-7, 0, 7]) {
            const hit = this.invaderHit(shot.x + dx, shot.y + dy)
            if (hit < 0) continue
            const at = this.invaderAt(hit)
            this.strike(hit, now)
            if (shot.hanabi) {
              shot.hanabi = false
              this.hanabiAt(at.x, at.y, now)
            }
          }
        }
        return true
      }
      const hit = this.invaderHit(shot.x, shot.y)
      if (hit < 0) return true
      const at = this.invaderAt(hit)
      this.strike(hit, now)
      if (shot.hanabi) this.hanabiAt(at.x, at.y, now)
      return false
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
    const box = this.shipBox()
    const safe = this.has('wow')
    this.bombs = this.bombs.filter((bomb) => {
      bomb.y += bombSpeed * dt
      if (bomb.y > this.h + 10) return false
      if (this.over || safe || now < this.invulnerableUntil) return true
      if (Math.abs(bomb.x - this.shipX) < box.half && bomb.y > box.top - 2 && bomb.y < box.bottom) {
        this.hitShip(now)
        return false
      }
      return true
    })

    this.capsules = this.capsules.filter((capsule) => {
      capsule.y += CAPSULE_SPEED * dt
      if (capsule.y > this.h + 20) return false
      if (this.over) return true
      if (Math.abs(capsule.x - this.shipX) < box.half + 12 && capsule.y > box.top - 14 && capsule.y < box.bottom + 10) {
        this.apply(capsule.type, now)
        return false
      }
      return true
    })

    this.arcs = this.arcs.filter((arc) => now - arc.born < ARC_MS)

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
    const glitching = this.clock < this.glitchUntil && !this.reduceMotion
    const shifts = [0, 0, 0].map(() => (glitching ? (Math.random() - 0.5) * this.size * 1.4 : 0))
    c.globalAlpha = ease
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      const { x, y, row } = this.invaderAt(i)
      const art = this.arts[row]
      if (!art) continue
      c.drawImage(art.image, x - art.w / 2 + shifts[row], y - art.h / 2 - (1 - ease) * 28, art.w, art.h)
    }
    c.globalAlpha = 1

    const hurt = now < this.invulnerableUntil
    const blink = hurt && Math.floor(now / 110) % 2 === 0
    if (!blink) {
      const body = new Path2D()
      const tear = new Path2D()
      const p = this.shipPitch
      const s = p * 0.7
      const sway = this.reduceMotion || this.shipDown ? 0 : this.sway
      this.squidPoints(this.shipDown ? SLEEP : SQUID, this.shipX, this.shipY, p, sway, (x, y, kind) => {
        if (kind === 'T' && hurt) return
        ;(kind === 'T' ? tear : body).rect(x - s / 2, y - s / 2, s, s)
      })
      const sparkle = this.has('wow') && !this.reduceMotion && Math.floor(now / 120) % 2 === 0
      c.globalAlpha = this.shipDown ? 0.55 : 1
      c.fillStyle = sparkle ? COLORS.beige : COLORS.cream
      c.fill(body)
      c.fillStyle = COLORS.warmCoral
      c.fill(tear)
      c.globalAlpha = 1
    }

    if (this.has('wingmen') && !this.shipDown) {
      const minis = new Path2D()
      const tears = new Path2D()
      const p = this.shipPitch * 0.45
      const sway = this.reduceMotion ? 0 : this.sway
      for (const wx of this.wings) {
        this.squidPoints(SQUID, wx, this.shipY + 4 * this.shipPitch, p, sway, (x, y, kind) => (kind === 'T' ? tears : minis).rect(x - p * 0.4, y - p * 0.4, p * 0.8, p * 0.8))
      }
      c.fillStyle = COLORS.beige
      c.fill(minis)
      c.fillStyle = COLORS.warmCoral
      c.fill(tears)
    }

    if (this.arcs.length) {
      const arcs = new Path2D()
      const sparks = new Path2D()
      let fade = 1
      for (const arc of this.arcs) {
        fade = Math.min(fade, 1 - (now - arc.born) / ARC_MS)
        for (let k = 0; k < arc.xs.length; k++) {
          arcs.rect(arc.xs[k] - 1.2, arc.ys[k] - 1.2, 2.4, 2.4)
          if (k % 3 === 0) sparks.rect(arc.xs[k] - 1 + (Math.random() - 0.5) * 6, arc.ys[k] - 1 + (Math.random() - 0.5) * 6, 1.6, 1.6)
        }
      }
      c.globalAlpha = Math.max(0.3, fade)
      c.fillStyle = COLORS.cream
      c.fill(arcs)
      c.fillStyle = COLORS.warmCoral
      c.fill(sparks)
      c.globalAlpha = 1
    }

    if (this.has('shield') && !this.shipDown) {
      const ring = new Path2D()
      const cy = this.shipY + (SQUID.length * this.shipPitch) / 2
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + (this.reduceMotion ? 0 : this.clock / 500)
        ring.rect(this.shipX + Math.cos(a) * this.shipPitch * 9 - 1, cy + Math.sin(a) * this.shipPitch * 8 - 1, 2, 2)
      }
      c.fillStyle = COLORS.beige
      c.globalAlpha = 0.85
      c.fill(ring)
      c.globalAlpha = 1
    }

    if (this.has('laser') && (this.keys.fire || this.pointer.firing) && !this.over) {
      const beam = new Path2D()
      const core = new Path2D()
      for (let y = this.shipY - 6; y > 40; y -= 4) {
        const jitter = this.reduceMotion ? 0 : (Math.random() - 0.5) * 2
        beam.rect(this.shipX - 3 + jitter, y, 2, 2)
        beam.rect(this.shipX + 1 - jitter, y, 2, 2)
        core.rect(this.shipX - 1, y, 2, 2)
      }
      c.fillStyle = COLORS.beige
      c.globalAlpha = 0.5
      c.fill(beam)
      c.globalAlpha = 1
      c.fillStyle = COLORS.cream
      c.fill(core)
    }

    if (this.input === 'mouse' && this.pointer.follow && !this.over) {
      c.fillStyle = COLORS.cream
      c.globalAlpha = 0.55
      c.fillRect(this.pointer.x - 1, this.pointer.y - 1, 2, 2)
      c.globalAlpha = 1
    }

    const shots = new Path2D()
    const inkTrail = new Path2D()
    const hanabiShots = new Path2D()
    for (const shot of this.shots) {
      const path = shot.hanabi ? hanabiShots : shots
      if (shot.big) {
        for (let gx = -2; gx <= 2; gx++) {
          for (let gy = -3; gy <= 3; gy++) {
            if (Math.abs(gx) + Math.abs(gy) > 3) continue
            path.rect(shot.x + gx * 3.4 - 1.2, shot.y + gy * 3.4 - 1.2, 2.4, 2.4)
          }
        }
        continue
      }
      const tilt = shot.vx / this.shotSpeed()
      path.rect(shot.x - 1, shot.y - 3, 2, 2)
      path.rect(shot.x - 3, shot.y - 1, 2, 2)
      path.rect(shot.x + 1, shot.y - 1, 2, 2)
      path.rect(shot.x - 1, shot.y + 1, 2, 2)
      inkTrail.rect(shot.x - 1 + tilt * 6, shot.y + 5, 2, 2)
      inkTrail.rect(shot.x - 1 + tilt * 10, shot.y + 9, 1.6, 1.6)
    }
    c.fillStyle = INK
    c.fill(inkTrail)
    c.fillStyle = COLORS.cream
    c.fill(shots)
    c.fillStyle = COLORS.warmCoral
    c.fill(hanabiShots)

    const bombs = new Path2D()
    for (const bomb of this.bombs) {
      const wiggle = Math.floor((bomb.y + now * 0.05) / 6) % 2 ? 1.5 : -1.5
      for (let k = 0; k < 3; k++) bombs.rect(bomb.x - 1 + (k % 2 ? wiggle : -wiggle), bomb.y - k * 4, 2, 2)
    }
    c.fillStyle = COLORS.beige
    c.globalAlpha = 0.85
    c.fill(bombs)
    c.globalAlpha = 1

    if (this.capsules.length) {
      c.font = '12px "Space Mono", ui-monospace, monospace'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      for (const capsule of this.capsules) {
        const spec = POWERS[capsule.type]
        const ring = new Path2D()
        const spin = this.reduceMotion ? 0 : this.clock / 400
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + spin
          ring.rect(capsule.x + Math.cos(a) * 11 - 1, capsule.y + Math.sin(a) * 11 - 1, 2, 2)
        }
        c.fillStyle = spec.tint
        c.fill(ring)
        c.fillText(spec.glyph, capsule.x, capsule.y + 1)
      }
    }

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
    this.clock += dt * 1000
    this.update(now, dt)
    this.paint(now)
    if (!this.over || this.n > 0) {
      this.raf = requestAnimationFrame(this.frame)
      return
    }
    this.raf = 0
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.over || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return
    const key = e.key.toLowerCase()
    if (key === 'arrowleft' || key === 'a') this.keys.left = true
    else if (key === 'arrowright' || key === 'd') this.keys.right = true
    else if (key === ' ' || key === 'arrowup' || key === 'w') this.keys.fire = true
    else return
    if (key !== ' ' && key !== 'arrowup' && key !== 'w') this.pointer.follow = false
    e.preventDefault()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    if (typing(e.target)) return
    const key = e.key.toLowerCase()
    if (key === 'arrowleft' || key === 'a') this.keys.left = false
    else if (key === 'arrowright' || key === 'd') this.keys.right = false
    else if (key === ' ' || key === 'arrowup' || key === 'w') this.keys.fire = false
  }

  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault()
    const kind: InputKind = e.pointerType === 'mouse' ? 'mouse' : 'touch'
    this.setInput(kind)
    if (this.over) return
    if (kind === 'touch' && e.clientY < this.h * 0.4) return
    this.canvas.setPointerCapture?.(e.pointerId)
    this.pointer = { follow: true, firing: true, x: e.clientX, y: e.clientY, id: e.pointerId }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      this.setInput('mouse')
      this.pointer.x = e.clientX
      this.pointer.y = e.clientY
      if (!this.over) this.pointer.follow = true
      return
    }
    if (e.pointerId !== this.pointer.id || !this.pointer.firing) return
    this.pointer.x = e.clientX
    this.pointer.y = e.clientY
  }

  private onPointerUp = (e: PointerEvent) => {
    this.pointer.firing = false
    if (e.pointerType !== 'mouse') this.pointer.follow = false
  }

  private onBlur = () => {
    this.keys = { left: false, right: false, fire: false }
    this.pointer.firing = false
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
