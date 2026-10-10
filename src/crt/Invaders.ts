import { COLORS } from './tokens'
import { SPRITES, type GridSprite } from './sprites'
import { BULLET_ART, BUG, DUCK, FOE_ROSTER, BIG_FACE, CHAIR, ONIGIRI, SOCK, TOASTER, UFO_CAT, VENDING, type BulletShape } from './foeArt'
import { POWERS, TIMED_SLOTS, dropChance, pickPower, pityKills, type PowerType } from './powers'
import { bulletCap, enrageCap, enrageGap, patternsFor, planWave, shieldHits, shieldMs, volleyRate, type BossKind, type Formation, type Pattern, type WavePlan } from './waves'

const LETTERS = 'ABCDEFGHIJKLMNOP'
const START_LIVES = 3
const FORM_MS = 700
const READY_MS = 1000
const NEXT_WAVE_MS = 1600
const INVULNERABLE_MS = 1700
const SHOT_COOLDOWN = 160
const RAPID_COOLDOWN = 110
const ROCKET_COOLDOWN = 230
const LASER_TICK = 160
const GLITCH_MS = 380
const CAPSULE_SPEED = 72
const GRAVITY = 160
const WING_GAP = 34
const CHAIN_LINKS = 3
const ARC_MS = 450
const LASER_SOUND_MS = 320
const MAX_BULLETS = 340
const MAX_SHOTS = 320
const MAX_WORDS = 16
const SWELL_MS = 620
const PERF_FRAMES = 240
const SHELL = ['#F0EEE9', '#DCD7C9', '#C9C4B8', '#9A958B', COLORS.warmCoral]
const DOGE_WORDS = ['wow', 'such damage', 'very shoot', 'much pew', 'so chaos', 'amaze', 'many hit', 'very bullet hell', 'such power', 'wow', 'much explode', 'so strong', 'very invader', 'excite']
const DOGE_COLORS = [COLORS.cream, COLORS.teal, COLORS.coral, COLORS.warmCoral, COLORS.beige, COLORS.dustyRose]
const DOGE_FONT = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", "Comic Sans", "Marker Felt", cursive'
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
const TENTACLE_ROW = 10
const INK = '#6B6761'
const SHAPES: BulletShape[] = ['dot', 'heart', 'skull', 'diamond']
const BOSS_ART: Record<BossKind, GridSprite> = { face: BIG_FACE, toaster: TOASTER, duck: DUCK }

export type InputKind = 'mouse' | 'touch'

export type InvadersHud = { score: number; wave: number; lives: number }

export type ActivePower = { type: PowerType; left: number; count?: number }

export type WaveInfo = { wave: number; formation: Formation; boss: BossKind | null }

export type SoundCue = 'shot' | 'laser' | 'kill' | 'boom' | 'hurt' | 'shield' | 'power' | 'glitch' | 'clear' | 'over' | 'rocket' | 'burst' | 'boss' | 'enrage' | 'wow'

export type InvadersStats = { foes: number; bullets: number; shots: number; particles: number; words: number; enraged: number; wave: number; formation: Formation; p95: number; work95: number }

export type InvadersEvents = {
  onHud: (hud: InvadersHud) => void
  onOver: (score: number, wave: number) => void
  onHit: (x: number, y: number) => void
  onInput: (kind: InputKind) => void
  onShot: () => void
  onLayout: (hintY: number) => void
  onPower: (type: PowerType) => void
  onPowers: (active: ActivePower[]) => void
  onGlitch: () => void
  onTear: (strength: number) => void
  onWave: (info: WaveInfo) => void
  onSound: (cue: SoundCue, pan: number) => void
}

type Art = { xs: Float32Array; ys: Float32Array; ci: Uint8Array; colors: string[]; w: number; h: number; pitch: number; image: HTMLCanvasElement }

type FoeKind = 'grid' | 'snake' | 'ring' | 'rain' | 'tank' | 'boss'

type Foe = {
  sprite: GridSprite
  mult: number
  art: Art
  kind: FoeKind
  index: number
  x: number
  y: number
  hx: number
  hy: number
  hp: number
  maxHp: number
  points: number
  drop: number
  phase: number
  spawnAt: number
  dead: boolean
  flashUntil: number
  hitAt: number
  rage: 0 | 1 | 2
  rageAt: number
  rageScale: number
  jerkAt: number
  jerks: number
  vx: number
  vy: number
  bossDrops: number
}

type ShotKind = 'dart' | 'big' | 'rocket' | 'spark'

type Shot = { x: number; y: number; vx: number; vy: number; kind: ShotKind; gen: number; born: number; ttl: number; apex: number; dead: boolean }

type Arc = { xs: number[]; ys: number[]; born: number }

type Capsule = { type: PowerType; x: number; y: number }

type Word = { text: string; x: number; y: number; vx: number; vy: number; size: number; color: string; born: number; ttl: number; w: number; tilt: number; hitAt: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a)

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

export const shrinkSprite = (sprite: GridSprite) => {
  const rows = sprite.grid.length
  const cols = sprite.grid[0].length
  const out: { r: number; c: number; k: number }[] = []
  if (sprite.crisp) {
    sprite.grid.forEach((line, r) => {
      for (let c = 0; c < cols; c++) {
        const k = LETTERS.indexOf(line[c] ?? '.')
        if (k >= 0) out.push({ r, c, k })
      }
    })
    return { cells: out, rows, cols }
  }
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
  const res = dpr * (height > 90 ? 1.5 : 1)
  image.width = Math.max(1, Math.ceil(w * res))
  image.height = Math.max(1, Math.ceil(h * res))
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
    c.fillRect((q * pitch + (pitch - size) / 2) * res, (r * pitch + (pitch - size) / 2) * res, size * res, size * res)
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

const easeBack = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2)

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
  private palette: string[] = []
  private artCache = new Map<string, Art>()
  private plan: WavePlan = planWave(1)
  private foes: Foe[] = []
  private ox = 0
  private oy = 0
  private dir = 1
  private bob = 0
  private stepClock = 0
  private shipPitch = 2.4
  private shipX = 0
  private shipY = 0
  private shots: Shot[] = []
  private capsules: Capsule[] = []
  private arcs: Arc[] = []
  private words: Word[] = []
  private rockets: { at: number; x: number }[] = []
  private wings = [0, 0]
  private lastShot = 0
  private lastRocket = 0
  private fireClock = 0
  private bossClock = 0
  private bossAngle = 0
  private minionClock = 0
  private keys = { left: false, right: false, fire: false }
  private pointer = { follow: false, firing: false, x: 0, y: 0, id: -1 }
  private input: InputKind = 'mouse'
  private score = 0
  private wave = 1
  private lives = START_LIVES
  private over = false
  private waveStart = 0
  private nextWaveAt = 0
  private nextRageAt = 0
  private invulnerableUntil = 0
  private shipDown = false
  private sway = 0
  private clock = 0
  private powers = new Map<PowerType, number>()
  private durations = new Map<PowerType, number>()
  private shieldHp = 0
  private killsSinceDrop = 0
  private laserAt = 0
  private laserSoundAt = -Infinity
  private glitchUntil = 0
  private powersSent = 0
  private wordAt = 0
  private wowPulseAt = 0
  private shakeUntil = 0
  private shakeAmp = 0
  private god = false
  private cueAt = new Map<SoundCue, number>()
  private hitAt = 0
  private bn = 0
  private bx = new Float32Array(MAX_BULLETS)
  private by = new Float32Array(MAX_BULLETS)
  private bvx = new Float32Array(MAX_BULLETS)
  private bvy = new Float32Array(MAX_BULLETS)
  private bshape = new Uint8Array(MAX_BULLETS)
  private bbounce = new Uint8Array(MAX_BULLETS)
  private pcap = 7000
  private n = 0
  private px = new Float32Array(7000)
  private py = new Float32Array(7000)
  private vx = new Float32Array(7000)
  private vy = new Float32Array(7000)
  private born = new Float32Array(7000)
  private life = new Float32Array(7000)
  private psize = new Float32Array(7000)
  private pcolor = new Uint8Array(7000)
  private frameTimes = new Float32Array(PERF_FRAMES)
  private workTimes = new Float32Array(PERF_FRAMES)
  private frameIndex = 0
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
    this.shieldHp = 0
    this.killsSinceDrop = 0
    this.glitchUntil = 0
    this.capsules = []
    this.arcs = []
    this.words = []
    this.rockets = []
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

  jump(wave: number) {
    if (this.over) return
    this.wave = Math.max(1, Math.floor(wave))
    this.newWave(performance.now())
    this.hud()
  }

  enrage() {
    this.rageOne(performance.now())
  }

  setGod(on: boolean) {
    this.god = on
  }

  die() {
    if (this.over) return
    this.lives = 0
    this.hud()
    this.endGame()
  }

  stats(): InvadersStats {
    const p95 = (list: Float32Array) => {
      const sorted = Array.from(list).filter((v) => v > 0).sort((a, b) => a - b)
      return sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0
    }
    let foes = 0
    let enraged = 0
    for (const foe of this.foes) {
      if (foe.dead) continue
      foes++
      if (foe.rage) enraged++
    }
    return { foes, bullets: this.bn, shots: this.shots.length, particles: this.n, words: this.words.length, enraged, wave: this.wave, formation: this.plan.formation, p95: p95(this.frameTimes), work95: p95(this.workTimes) }
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
    this.size = Math.round(Math.max(22, Math.min(40, this.w / 13, this.h / 22)))
    this.shipPitch = this.w < 520 ? 2.2 : 3
    this.pcap = this.w < 520 ? 3600 : 7000
    this.n = Math.min(this.n, this.pcap)
    this.placeShip()
    this.artCache.clear()
    for (const foe of this.foes) foe.art = this.artFor(foe.sprite, foe.mult)
    this.ox *= this.w / prevW
    this.oy *= this.h / prevH
    this.shipX = Math.min(this.left + this.field, Math.max(this.left, (this.shipX * this.w) / prevW))
  }

  private artFor(sprite: GridSprite, mult: number) {
    const height = Math.round(this.size * mult)
    const key = `${sprite.name}:${height}`
    let art = this.artCache.get(key)
    if (!art) {
      art = buildArt(sprite, height, this.dpr)
      this.artCache.set(key, art)
    }
    return art
  }

  private placeShip() {
    this.shipY = this.input === 'touch' ? this.h - Math.max(150, this.h * 0.2) : this.h - Math.max(64, this.h * 0.09)
    this.events.onLayout(this.top() + 2 * this.size * 1.45 + this.size + 28)
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

  private foe(sprite: GridSprite, mult: number, kind: FoeKind, index: number, hp: number, points: number, drop: number): Foe {
    return { sprite, mult, art: this.artFor(sprite, mult), kind, index, x: -999, y: -999, hx: 0, hy: 0, hp, maxHp: hp, points, drop, phase: Math.random() * Math.PI * 2, spawnAt: 0, dead: false, flashUntil: 0, hitAt: 0, rage: 0, rageAt: 0, rageScale: 1, jerkAt: 0, jerks: 0, vx: 0, vy: 0, bossDrops: 0 }
  }

  private newWave(now: number) {
    const plan = planWave(this.wave)
    this.plan = plan
    this.foes = []
    this.dir = 1
    this.stepClock = 0
    this.fireClock = 0
    this.bossClock = 0
    this.minionClock = 0
    this.shots = []
    this.bn = 0
    this.rockets = []
    this.waveStart = now
    this.nextWaveAt = 0
    this.nextRageAt = now + READY_MS + enrageGap(this.wave) * 1000 * rand(0.5, 1.1)
    const f = plan.formation
    const mult = plan.scale
    if (f === 'grid' || f === 'minis' || f === 'chonk' || f === 'swarm') {
      const baseCols = f === 'swarm' ? 12 : f === 'minis' ? 8 : f === 'chonk' ? 4 : 6
      const cols = this.w < 520 ? Math.max(3, baseCols - (f === 'swarm' ? 2 : f === 'chonk' ? 1 : 1)) : baseCols
      const rows = Math.max(1, Math.round(plan.count / baseCols))
      const height = this.size * mult
      const sx = Math.min(height * 1.25 * 1.4 + 6, this.field / (cols + 0.6))
      const sy = height * 1.45
      const pool = shuffle([...SPRITES, ...FOE_ROSTER])
      for (let row = 0; row < rows; row++) {
        const rowSprite = pool[row % pool.length]
        for (let col = 0; col < cols; col++) {
          const sprite = f === 'swarm' ? BUG : f === 'chonk' ? pick([TOASTER, ONIGIRI, CHAIR, DUCK, UFO_CAT, SOCK]) : rowSprite
          const points = f === 'swarm' ? 5 : f === 'chonk' ? 50 : f === 'minis' ? 15 : Math.max(10, 30 - row * 10)
          const foe = this.foe(sprite, mult, 'grid', row * cols + col, plan.hp, points, f === 'swarm' ? 0.22 : f === 'chonk' ? 1.6 : f === 'minis' ? 0.7 : 1)
          foe.hx = col * sx
          foe.hy = row * sy
          this.foes.push(foe)
        }
      }
      this.ox = this.left + (this.field - (cols - 1) * sx) / 2
      this.oy = this.top()
    } else if (f === 'snake') {
      for (let i = 0; i < plan.count; i++) this.foes.push(this.foe(DUCK, i === 0 ? mult * 1.5 : mult, 'snake', i, i === 0 ? plan.hp + 4 : plan.hp, i === 0 ? 80 : 15, 0.8))
    } else if (f === 'ring') {
      for (let i = 0; i < plan.count; i++) this.foes.push(this.foe(UFO_CAT, mult, 'ring', i, plan.hp, 25, 0.8))
    } else if (f === 'rain') {
      const gap = Math.max(160, 420 - this.wave * 14)
      for (let i = 0; i < plan.count; i++) {
        const foe = this.foe(pick([SOCK, SOCK, CHAIR, ONIGIRI]), mult, 'rain', i, plan.hp, 20, 0.7)
        foe.spawnAt = now + READY_MS + i * gap
        this.rainReset(foe)
        foe.y = -9999
        this.foes.push(foe)
      }
    } else if (f === 'tanks') {
      for (let i = 0; i < plan.count; i++) this.foes.push(this.foe(VENDING, mult, 'tank', i, plan.hp, 300, 3))
    } else {
      const boss = this.foe(BOSS_ART[plan.boss ?? 'face'], mult, 'boss', 0, plan.hp, 3000, 0)
      boss.x = this.w / 2
      boss.y = -boss.art.h
      this.foes.push(boss)
      this.cue('boss', this.w / 2)
      this.events.onTear(1.4)
      this.shake(6, 700)
    }
    this.positionFoes(now, 0)
    this.events.onWave({ wave: this.wave, formation: f, boss: plan.boss })
  }

  private rainReset(foe: Foe) {
    foe.hx = this.left + 20 + Math.random() * (this.field - 40)
    foe.y = -foe.art.h
    foe.vy = this.h * rand(0.07, 0.12) * Math.min(1.8, 1 + 0.03 * this.wave)
  }

  private hud() {
    this.events.onHud({ score: this.score, wave: this.wave, lives: this.lives })
  }

  private cue(cue: SoundCue, x = this.shipX) {
    const gap = cue === 'kill' ? 45 : cue === 'boom' || cue === 'burst' ? 90 : cue === 'rocket' ? 140 : cue === 'enrage' ? 250 : 0
    const at = this.cueAt.get(cue) ?? -Infinity
    if (gap && this.clock - at < gap) return
    this.cueAt.set(cue, this.clock)
    this.events.onSound(cue, this.w ? (x / this.w) * 1.2 - 0.6 : 0)
  }

  private ripple(x: number, y: number) {
    if (this.clock - this.hitAt < 40) return
    this.hitAt = this.clock
    this.events.onHit(x, y)
  }

  private shake(amp: number, ms: number) {
    if (this.reduceMotion) return
    if (this.clock < this.shakeUntil && this.shakeAmp > amp) return
    this.shakeAmp = amp
    this.shakeUntil = this.clock + ms
  }

  private has(type: PowerType) {
    return this.powers.has(type)
  }

  private sendPowers(force = false) {
    if (!force && this.clock - this.powersSent < 100) return
    this.powersSent = this.clock
    const active: ActivePower[] = [...this.powers].map(([type, until]) => ({
      type,
      left: Math.max(0, Math.min(1, (until - this.clock) / (this.durations.get(type) ?? POWERS[type].ms))),
      count: type === 'shield' ? this.shieldHp : undefined,
    }))
    this.events.onPowers(active)
  }

  private apply(type: PowerType, now: number) {
    this.events.onPower(type)
    this.cue(type === 'glitch' ? 'glitch' : type === 'wow' ? 'wow' : 'power')
    if (type === 'glitch') {
      this.glitch()
    } else {
      if (!this.powers.has(type) && this.powers.size >= TIMED_SLOTS) {
        let oldest: PowerType | null = null
        for (const [kind, until] of this.powers) if (!oldest || until < (this.powers.get(oldest) ?? 0)) oldest = kind
        if (oldest) this.powers.delete(oldest)
        if (oldest === 'shield') this.shieldHp = 0
      }
      if (type === 'wingmen' && !this.powers.has('wingmen')) this.wings = [this.shipX - this.w * 0.6, this.shipX + this.w * 0.6]
      const ms = type === 'shield' ? shieldMs(this.wave) : POWERS[type].ms
      if (type === 'shield') this.shieldHp = Math.min(shieldHits(this.wave) + 2, (this.powers.has('shield') ? this.shieldHp : 0) + shieldHits(this.wave))
      this.durations.set(type, ms)
      this.powers.set(type, this.clock + ms)
      if (type === 'hanabi') this.barrage(now)
      if (type === 'wow') this.wowPulse(now, true)
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

  private barrage(now: number) {
    const count = this.w < 520 ? 7 : 10
    for (let k = 0; k < count; k++) this.rockets.push({ at: now + k * 90, x: this.left + ((k + 0.5) / count) * this.field + rand(-12, 12) })
  }

  private glitch() {
    this.oy = Math.max(this.top(), this.oy - this.size * 1.45 * 2)
    const pool = [...SPRITES, ...FOE_ROSTER]
    for (const foe of this.foes) {
      if (foe.kind === 'boss' || foe.dead) continue
      foe.sprite = pick(pool)
      foe.art = this.artFor(foe.sprite, foe.mult)
    }
    for (let i = this.bn - 1; i >= 0; i -= 2) this.removeBullet(i)
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
    if (this.n >= this.pcap) return
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

  private scaleOf(foe: Foe) {
    if (!foe.rage) return 1
    if (foe.rage === 2) return foe.rageScale
    const k = Math.min(1, (this.clock - foe.rageAt) / SWELL_MS)
    return 1 + (foe.rageScale - 1) * easeBack(k)
  }

  private halfW(foe: Foe) {
    return (foe.art.w * this.scaleOf(foe)) / 2
  }

  private halfH(foe: Foe) {
    return (foe.art.h * this.scaleOf(foe)) / 2
  }

  private live(foe: Foe, now: number) {
    return !foe.dead && now >= foe.spawnAt && foe.y > -foe.art.h * 2
  }

  private foeAt(x: number, y: number, now: number, pad = 0) {
    for (let i = this.foes.length - 1; i >= 0; i--) {
      const foe = this.foes[i]
      if (!this.live(foe, now)) continue
      if (Math.abs(x - foe.x) <= this.halfW(foe) + 1 + pad && Math.abs(y - foe.y) <= this.halfH(foe) + 4 + pad) return foe
    }
    return null
  }

  private hurt(foe: Foe, dmg: number, now: number) {
    if (foe.dead) return false
    foe.hp -= dmg
    foe.flashUntil = this.clock + 70
    if (foe.kind === 'boss') {
      const thresholds = Math.floor((1 - Math.max(0, foe.hp) / foe.maxHp) * 4)
      while (foe.bossDrops < thresholds && foe.hp > 0) {
        foe.bossDrops++
        this.capsules.push({ type: pickPower(Math.random, this.wave), x: foe.x + rand(-40, 40), y: foe.y })
        this.shake(4, 250)
      }
    }
    if (foe.hp > 0) {
      if (foe.maxHp > 2) {
        const cream = this.colorIndex(COLORS.cream)
        for (let k = 0; k < 4; k++) this.add(foe.x + rand(-6, 6), foe.y + this.halfH(foe) * 0.6, rand(-80, 80), rand(-60, 20), 260, cream, 1.4, now)
      }
      return false
    }
    this.kill(foe, now)
    return true
  }

  private kill(foe: Foe, now: number) {
    foe.dead = true
    const { x, y } = foe
    const scale = this.scaleOf(foe)
    this.shatter(foe.art, x, y, now, scale)
    this.ripple(x, y)
    this.cue('kill', x)
    const bonus = foe.rage ? 250 : 0
    this.score += (foe.points + bonus) * this.wave
    this.hud()
    if (foe.rage || foe.kind === 'boss' || foe.kind === 'tank') {
      this.bigBurst(x, y, now, foe.kind === 'boss' ? 2.2 : foe.rage ? 1.4 : 1)
      this.shake(foe.kind === 'boss' ? 12 : 6, foe.kind === 'boss' ? 900 : 400)
    }
    if (foe.kind === 'boss') {
      for (let k = 0; k < 3; k++) this.capsules.push({ type: pickPower(Math.random, this.wave), x: x + (k - 1) * 50, y })
      for (const other of this.foes) if (!other.dead) this.kill(other, now)
    } else {
      this.killsSinceDrop += foe.drop + (foe.rage ? 1 : 0)
      if (this.killsSinceDrop >= pityKills(this.wave) || Math.random() < dropChance(this.wave) * (foe.drop + (foe.rage ? 1.5 : 0))) {
        this.killsSinceDrop = 0
        this.capsules.push({ type: pickPower(Math.random, this.wave), x, y })
      }
    }
    if (!this.nextWaveAt && !this.foes.some((other) => !other.dead)) {
      this.nextWaveAt = now + NEXT_WAVE_MS
      this.cue('clear', x)
    }
  }

  private strike(foe: Foe, dmg: number, now: number) {
    const from = { x: foe.x, y: foe.y }
    const killed = this.hurt(foe, dmg, now)
    if (!this.has('chain') || !killed) return killed
    const near: { foe: Foe; d: number }[] = []
    for (const other of this.foes) {
      if (!this.live(other, now)) continue
      near.push({ foe: other, d: Math.hypot(other.x - from.x, other.y - from.y) })
    }
    near.sort((a, b) => a.d - b.d)
    for (const { foe: other } of near.slice(0, CHAIN_LINKS)) {
      this.arcs.push(this.arc(from.x, from.y, other.x, other.y, now))
      this.hurt(other, 2, now)
    }
    return killed
  }

  private arc(x0: number, y0: number, x1: number, y1: number, now: number): Arc {
    const length = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(2, Math.min(80, Math.round(length / 4)))
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

  private bigBurst(x: number, y: number, now: number, power: number) {
    const colors = SHELL.map((hex) => this.colorIndex(hex))
    const count = Math.round(150 * power)
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + Math.random() * 0.2
      const ring = k % 3 === 0
      const v = (ring ? 260 : 80 + Math.random() * 220) * Math.min(1.6, power)
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, 900 + Math.random() * 800, colors[k % colors.length], k % 5 === 0 ? 2.4 : 1.8, now)
    }
    this.ripple(x, y)
    this.cue('burst', x)
  }

  private rocketBurst(x: number, y: number, gen: number, now: number) {
    const sparks = gen === 0 ? 14 : 7
    const speed = gen === 0 ? 330 : 240
    const offset = Math.random() * Math.PI
    for (let k = 0; k < sparks && this.shots.length < MAX_SHOTS; k++) {
      const a = offset + (k / sparks) * Math.PI * 2
      this.shots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, kind: 'spark', gen: gen + 1, born: this.clock, ttl: gen === 0 ? 620 : 420, apex: 0, dead: false })
    }
    const colors = SHELL.map((hex) => this.colorIndex(hex))
    const count = gen === 0 ? 70 : 24
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2
      const v = (gen === 0 ? 90 : 50) + Math.random() * (gen === 0 ? 170 : 90)
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, 700 + Math.random() * 600, colors[k % colors.length], k % 4 === 0 ? 2.2 : 1.6, now)
    }
    if (gen === 0) {
      this.ripple(x, y)
      this.cue('boom', x)
    }
  }

  private shatter(art: Art, x: number, y: number, now: number, scale = 1) {
    const colors = art.colors.map((hex) => this.colorIndex(hex))
    const step = art.xs.length > 260 ? 2 : 1
    for (let k = 0; k < art.xs.length; k += step) {
      const dx = art.xs[k] * scale
      const dy = art.ys[k] * scale
      const d = Math.hypot(dx, dy) || 1
      const speed = 40 + Math.random() * 140 * Math.sqrt(scale)
      this.add(x + dx, y + dy, (dx / d) * speed + (Math.random() - 0.5) * 50, (dy / d) * speed - 30 - Math.random() * 40, 600 + Math.random() * 500, colors[art.ci[k]], Math.max(1.2, art.pitch * 0.62 * Math.min(2, scale)), now)
    }
    const cream = this.colorIndex(COLORS.cream)
    for (let k = 0; k < 10; k++) {
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

  private shipCenter() {
    return this.shipY + 5.5 * this.shipPitch
  }

  private dropTear(now: number) {
    const p = this.shipPitch
    const x = this.shipX - (SQUID[0].length * p) / 2 + 3 * p + p / 2
    const coral = this.colorIndex(COLORS.warmCoral)
    this.add(x, this.shipY + 8 * p, (Math.random() - 0.5) * 10, 40, 1400, coral, p * 0.8, now)
  }

  private clearBullets(x: number, y: number, radius: number, now: number, reflect: boolean) {
    const sparkle = this.colorIndex(COLORS.beige)
    for (let i = this.bn - 1; i >= 0; i--) {
      const dx = this.bx[i] - x
      const dy = this.by[i] - y
      if (dx * dx + dy * dy > radius * radius) continue
      if (reflect && this.shots.length < MAX_SHOTS) {
        const d = Math.hypot(dx, dy) || 1
        this.shots.push({ x: this.bx[i], y: this.by[i], vx: (dx / d) * 380, vy: Math.min(-160, (dy / d) * 380), kind: 'spark', gen: 2, born: this.clock, ttl: 900, apex: 0, dead: false })
      } else {
        this.add(this.bx[i], this.by[i], rand(-40, 40), rand(-60, 0), 300, sparkle, 1.6, now)
      }
      this.removeBullet(i)
    }
  }

  private hitShip(now: number) {
    if (this.god) return
    const cy = this.shipCenter()
    if (this.has('shield') && this.shieldHp > 0) {
      this.shieldHp--
      this.invulnerableUntil = now + 650
      const cream = this.colorIndex(COLORS.cream)
      const radius = this.shipPitch * (9 + this.shieldHp * 2.4)
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * Math.PI * 2
        this.add(this.shipX + Math.cos(a) * radius, cy + Math.sin(a) * radius, Math.cos(a) * 160, Math.sin(a) * 160, 500, cream, 1.8, now)
      }
      if (this.shieldHp <= 0) {
        this.powers.delete('shield')
        this.clearBullets(this.shipX, cy, 220, now, true)
        this.cue('burst')
        this.shake(5, 300)
        this.ripple(this.shipX, cy)
      } else {
        this.clearBullets(this.shipX, cy, 90, now, false)
        this.cue('shield')
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
    this.ripple(this.shipX, this.shipY)
    this.lives = Math.max(0, this.lives - 1)
    this.cue('hurt')
    this.shake(7, 350)
    this.bn = 0
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
    this.shieldHp = 0
    this.capsules = []
    this.words = []
    this.rockets = []
    this.sendPowers(true)
    this.cue('over')
    this.events.onOver(this.score, this.wave)
  }

  private interval() {
    let count = 0
    let total = 0
    for (const foe of this.foes) {
      if (foe.kind !== 'grid') continue
      total++
      if (!foe.dead && !foe.rage) count++
    }
    const frac = total ? count / total : 0
    const swarm = this.plan.formation === 'swarm' ? 0.55 : 1
    return Math.max(0.035, (0.05 + 0.5 * frac * frac) * Math.pow(0.88, Math.min(this.wave, 14) - 1) * swarm)
  }

  private stepFormation(now: number) {
    let minX = Infinity
    let maxX = -Infinity
    let bottom = -Infinity
    for (const foe of this.foes) {
      if (foe.dead || foe.rage || foe.kind !== 'grid') continue
      const x = this.ox + foe.hx
      const y = this.oy + foe.hy + this.bob
      minX = Math.min(minX, x - foe.art.w / 2)
      maxX = Math.max(maxX, x + foe.art.w / 2)
      bottom = Math.max(bottom, y + foe.art.h / 2)
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
    if (bottom >= this.shipY - 4 && !this.god) {
      this.powers.delete('shield')
      this.powers.delete('wow')
      this.shieldHp = 0
      this.lives = 1
      this.hitShip(now)
    }
  }

  private positionFoes(now: number, dt: number) {
    const t = Math.max(0, now - this.waveStart) / 1000
    const f = this.plan.formation
    let alive = 0
    for (const foe of this.foes) if (!foe.dead) alive++
    const frac = this.foes.length ? alive / this.foes.length : 0
    const mid = this.left + this.field / 2
    for (const foe of this.foes) {
      if (foe.dead || foe.rage) continue
      if (foe.kind === 'grid') {
        const jitter = f === 'swarm' && !this.reduceMotion
        foe.x = this.ox + foe.hx + (jitter ? Math.sin(t * 6 + foe.phase) * 3 : 0)
        foe.y = this.oy + foe.hy + this.bob + (jitter ? Math.cos(t * 5 + foe.phase * 1.3) * 3 : 0)
      } else if (foe.kind === 'snake') {
        const gap = this.size * this.plan.scale * 1.35
        const speed = this.field * 0.3 * Math.min(1.8, 1 + 0.03 * this.wave) * (1 + (1 - frac) * 0.6)
        const u = t * speed - foe.index * gap - (foe.index ? gap * 0.3 : 0)
        const rowH = this.size * 1.3
        const lanes = Math.max(1, Math.floor((this.shipY - 200 - this.top()) / rowH))
        if (u < 0) {
          foe.x = this.left + u
          foe.y = this.top()
        } else {
          const lane = u / this.field
          const k = lane % 2
          const tri = k < 1 ? k : 2 - k
          foe.x = this.left + tri * this.field
          foe.y = this.top() + Math.min(lane, lanes) * rowH + Math.sin(u * 0.045) * this.size * 0.35
        }
      } else if (foe.kind === 'ring') {
        const count = this.foes.length
        const spin = 0.6 + 1.1 * (1 - frac)
        const radius = Math.min(this.field * 0.32, (this.shipY - this.top()) * 0.3) * (1 + 0.14 * Math.sin(t * 2.2)) * Math.min(1, t * 1.4)
        const cx = mid + Math.sin(t * 0.45) * this.field * 0.18
        const cy = this.top() + Math.min(this.field * 0.32, (this.shipY - this.top()) * 0.3) + 10 + Math.sin(t * 0.8) * 14
        const a = (foe.index / count) * Math.PI * 2 + t * spin
        foe.x = cx + Math.cos(a) * radius
        foe.y = cy + Math.sin(a) * radius
      } else if (foe.kind === 'rain') {
        if (now < foe.spawnAt) continue
        if (foe.y < -foe.art.h * 2) foe.y = -foe.art.h
        foe.y += foe.vy * dt
        foe.x = foe.hx + Math.sin(t * 1.6 + foe.phase) * 22
        if (foe.y > this.h + foe.art.h) this.rainReset(foe)
      } else if (foe.kind === 'tank') {
        const home = this.left + this.field * ((foe.index + 0.5) / Math.max(1, this.plan.count))
        foe.x = home + Math.sin(t * 0.35 + foe.index * 2) * this.field * 0.1
        foe.y = this.top() + foe.art.h * 0.5 + Math.min(this.h * 0.16, t * 4) + Math.sin(t * 0.7 + foe.index) * 8 - Math.max(0, 1 - t * 1.2) * 160
      } else {
        const enter = Math.min(1, t / 1.6)
        const restY = this.top() + foe.art.h * 0.5 - 10
        foe.x = mid + Math.sin(t * 0.45) * this.field * 0.28 * enter
        foe.y = -foe.art.h + (restY + foe.art.h) * (1 - Math.pow(1 - enter, 3)) + Math.sin(t * 0.9) * 14 * enter
      }
    }
  }

  private rageOne(now: number) {
    let raging = 0
    const pool: Foe[] = []
    for (const foe of this.foes) {
      if (foe.dead) continue
      if (foe.rage) raging++
      else if (foe.kind !== 'boss' && this.live(foe, now) && foe.y > 40 && foe.y < this.shipY - 60) pool.push(foe)
    }
    if (!pool.length || raging >= enrageCap(this.wave)) return
    const foe = pick(pool)
    foe.rage = 1
    foe.rageAt = this.clock
    foe.rageScale = Math.max(2, Math.min(rand(2, 4), (this.size * 4.2) / foe.art.h, 4))
    if (foe.kind === 'grid' && this.plan.formation === 'swarm') foe.rageScale = 4
    foe.hp += 3 + Math.floor(this.wave / 2)
    foe.maxHp = foe.hp
    foe.vx = 0
    foe.vy = 0
    foe.jerks = 0
    this.cue('enrage', foe.x)
    this.events.onTear(0.7)
    this.shake(3, SWELL_MS)
  }

  private updateRage(foe: Foe, now: number, dt: number) {
    const cy = this.shipCenter()
    if (foe.rage === 1) {
      if (this.clock - foe.rageAt >= SWELL_MS) {
        foe.rage = 2
        foe.jerkAt = this.clock + 120
      }
      return
    }
    const creep = 18 + foe.jerks * 7
    const dx = this.shipX - foe.x
    const dy = cy - foe.y
    const d = Math.hypot(dx, dy) || 1
    if (this.clock >= foe.jerkAt) {
      foe.jerks++
      const a = Math.atan2(dy, dx) + rand(-0.55, 0.55)
      const burst = Math.min(520, (130 + 10 * this.wave) * (1 + foe.jerks * 0.18))
      foe.vx = Math.cos(a) * burst
      foe.vy = Math.sin(a) * burst
      foe.jerkAt = this.clock + rand(380, 820) * Math.max(0.45, 1 - foe.jerks * 0.06)
    }
    const decay = Math.exp(-dt * 5)
    foe.vx *= decay
    foe.vy *= decay
    foe.x += (foe.vx + (dx / d) * creep) * dt
    foe.y += (foe.vy + (dy / d) * creep) * dt
    foe.x = Math.max(this.left - 20, Math.min(this.left + this.field + 20, foe.x))
    foe.y = Math.max(-20, Math.min(this.h - 10, foe.y))
    if (this.over || now < this.invulnerableUntil || this.has('wow')) return
    const reach = Math.min(this.halfW(foe), this.halfH(foe)) * 0.8 + this.shipPitch * 3
    if (Math.abs(foe.x - this.shipX) < reach && Math.abs(foe.y - cy) < reach) {
      this.hitShip(now)
      foe.vy = -380
      foe.vx = rand(-160, 160)
      foe.jerkAt = this.clock + 800
    }
  }

  private bulletSpeed() {
    return this.h * 0.28 * Math.min(1.55, 1 + 0.035 * (this.wave - 1))
  }

  private bullet(x: number, y: number, vx: number, vy: number, shape: BulletShape, bounce = 0) {
    const cap = Math.min(MAX_BULLETS, Math.max(bulletCap(this.wave), this.plan.formation === 'boss' ? 90 + this.wave * 10 : 0))
    if (this.bn >= cap) return
    const i = this.bn++
    this.bx[i] = x
    this.by[i] = y
    this.bvx[i] = vx
    this.bvy[i] = vy
    this.bshape[i] = SHAPES.indexOf(shape)
    this.bbounce[i] = bounce
  }

  private removeBullet(i: number) {
    const last = --this.bn
    this.bx[i] = this.bx[last]
    this.by[i] = this.by[last]
    this.bvx[i] = this.bvx[last]
    this.bvy[i] = this.bvy[last]
    this.bshape[i] = this.bshape[last]
    this.bbounce[i] = this.bbounce[last]
  }

  private silly(): BulletShape {
    if (this.wave < 5) return 'dot'
    const r = Math.random()
    return r < 0.35 ? 'heart' : r < 0.6 ? 'skull' : 'dot'
  }

  private pattern(kind: Pattern, x: number, y: number) {
    const v = this.bulletSpeed()
    const aim = Math.atan2(this.shipCenter() - y, this.shipX - x)
    const down = Math.PI / 2
    const w = this.wave
    if (kind === 'drop') {
      this.bullet(x, y, 0, w <= 2 ? this.h * 0.3 : v, 'dot')
    } else if (kind === 'aimed') {
      const n = w < 5 ? 1 : 3
      for (let k = 0; k < n; k++) {
        const a = aim + (k - (n - 1) / 2) * 0.09
        this.bullet(x, y, Math.cos(a) * v * 1.05, Math.sin(a) * v * 1.05, w >= 6 ? 'skull' : 'dot')
      }
    } else if (kind === 'fan') {
      const n = Math.min(9, 3 + Math.floor(w / 3))
      const center = w >= 6 ? aim : down
      const shape = this.silly()
      for (let k = 0; k < n; k++) {
        const a = center + (k / (n - 1) - 0.5) * 1.0
        this.bullet(x, y, Math.cos(a) * v * 0.85, Math.sin(a) * v * 0.85, shape)
      }
    } else if (kind === 'bounce') {
      const n = w >= 9 ? 4 : 2
      for (let k = 0; k < n; k++) {
        const a = down + (k % 2 ? 1 : -1) * rand(0.55, 0.95)
        this.bullet(x, y, Math.cos(a) * v * 0.9, Math.sin(a) * v * 0.9, 'diamond', 3)
      }
    } else if (kind === 'ring') {
      const n = 8 + Math.min(10, w)
      const off = Math.random() * Math.PI
      const shape = w >= 6 ? 'heart' : 'dot'
      for (let k = 0; k < n; k++) {
        const a = off + (k / n) * Math.PI * 2
        this.bullet(x, y, Math.cos(a) * v * 0.6, Math.sin(a) * v * 0.6, shape)
      }
    } else if (kind === 'spiral') {
      const n = 14 + Math.min(14, w)
      const off = Math.random() * Math.PI * 2
      for (let k = 0; k < n; k++) {
        const a = off + k * 0.45
        const s = v * (0.45 + k * 0.025)
        this.bullet(x, y, Math.cos(a) * s, Math.sin(a) * s, k % 2 ? 'heart' : 'skull')
      }
    } else {
      for (let k = 0; k < 5; k++) {
        const s = v * (0.7 + k * 0.16)
        this.bullet(x, y, Math.cos(aim) * s, Math.sin(aim) * s, 'skull')
      }
    }
  }

  private shooter(now: number) {
    const pool: Foe[] = []
    for (const foe of this.foes) if (this.live(foe, now) && foe.kind !== 'boss' && foe.y > 30 && foe.y < this.shipY - 60) pool.push(foe)
    if (!pool.length) return null
    if (this.plan.formation === 'grid' || this.plan.formation === 'minis' || this.plan.formation === 'chonk') {
      const lowest = new Map<number, Foe>()
      for (const foe of pool) {
        const key = Math.round(foe.hx)
        const was = lowest.get(key)
        if (!was || foe.y > was.y) lowest.set(key, foe)
      }
      const front = [...lowest.values()]
      const near = front.filter((foe) => Math.abs(foe.x - this.shipX) < this.size * 2.8)
      return pick(near.length && Math.random() < 0.45 ? near : front)
    }
    return pick(pool)
  }

  private enemyFire(now: number, dt: number) {
    const boss = this.plan.formation === 'boss' ? this.foes.find((foe) => foe.kind === 'boss' && !foe.dead) : undefined
    if (boss && now - this.waveStart > 1800) this.bossFire(boss, dt)
    if (boss) {
      this.minionClock += dt
      let minions = 0
      for (const foe of this.foes) if (!foe.dead && foe.kind === 'rain') minions++
      if (this.minionClock > 5 && minions < 8) {
        this.minionClock = 0
        for (let k = 0; k < 2; k++) {
          const duck = this.foe(DUCK, 0.85, 'rain', this.foes.length, 1, 20, 0.9)
          this.rainReset(duck)
          duck.hx = boss.x + (k ? 40 : -40)
          duck.y = boss.y
          this.foes.push(duck)
        }
      }
    }
    this.fireClock += dt
    if (this.fireClock < 1 / volleyRate(this.wave)) return
    this.fireClock = Math.random() * 0.15
    const patterns = patternsFor(this.wave)
    const volleys = this.wave >= 8 && Math.random() < 0.4 ? 2 : 1
    for (let k = 0; k < volleys; k++) {
      const foe = this.shooter(now)
      if (!foe) return
      let kind = pick(patterns)
      if (foe.kind === 'tank' && this.wave > 2) kind = pick(['fan', 'burst', 'bounce', 'ring'] as Pattern[])
      if (this.plan.formation === 'swarm' && this.wave > 2 && Math.random() < 0.5) kind = 'drop'
      this.pattern(kind, foe.x, foe.y + this.halfH(foe))
    }
  }

  private bossFire(boss: Foe, dt: number) {
    this.bossClock += dt
    const phase = Math.floor(this.bossClock / 3.2) % 4
    const intensity = Math.min(2.2, 1 + (this.wave - 5) * 0.1)
    const mouthY = boss.y + boss.art.h * 0.3
    const v = this.bulletSpeed()
    if (phase === 0) {
      this.bossAngle += dt * 3.1
      if (Math.floor(this.bossClock * 12 * intensity) !== Math.floor((this.bossClock - dt) * 12 * intensity)) {
        const arms = intensity > 1.4 ? 3 : 2
        for (let k = 0; k < arms; k++) {
          const a = this.bossAngle + (k / arms) * Math.PI * 2
          this.bullet(boss.x, mouthY, Math.cos(a) * v * 0.55, Math.sin(a) * v * 0.55, k % 2 ? 'heart' : 'skull')
        }
      }
    } else if (phase === 1) {
      if (Math.floor(this.bossClock * 1.4 * intensity) !== Math.floor((this.bossClock - dt) * 1.4 * intensity)) this.pattern('fan', boss.x, mouthY)
    } else if (phase === 2) {
      if (Math.floor(this.bossClock * 1.6 * intensity) !== Math.floor((this.bossClock - dt) * 1.6 * intensity)) this.pattern('burst', boss.x + rand(-30, 30), mouthY)
    } else if (Math.floor(this.bossClock * 1.1 * intensity) !== Math.floor((this.bossClock - dt) * 1.1 * intensity)) {
      this.pattern(Math.random() < 0.5 ? 'ring' : 'bounce', boss.x, mouthY)
    }
  }

  private fire(now: number, sinceWave: number) {
    const firing = this.keys.fire || this.pointer.firing
    if (!firing || sinceWave < FORM_MS) return
    if (this.has('hanabi') && this.clock - this.lastRocket >= ROCKET_COOLDOWN) {
      this.lastRocket = this.clock
      this.launch(this.shipX, this.shipY - 4)
    }
    if (this.has('laser')) {
      if (this.clock - this.laserAt < LASER_TICK) return
      this.laserAt = this.clock
      if (this.clock - this.laserSoundAt >= LASER_SOUND_MS) {
        this.laserSoundAt = this.clock
        this.cue('laser')
      }
      for (const foe of this.foes) {
        if (!this.live(foe, now) || foe.y > this.shipY) continue
        if (Math.abs(foe.x - this.shipX) <= this.halfW(foe)) this.strike(foe, 1, now)
      }
      this.events.onShot()
      return
    }
    const rapid = this.has('rapid')
    const wingmen = this.has('wingmen')
    const volley = (this.has('spread') ? 3 : 1) + (wingmen ? 2 : 0)
    const max = (rapid ? 6 : 1) * volley
    let darts = 0
    for (const shot of this.shots) if (shot.kind === 'dart' || shot.kind === 'big') darts++
    if (darts + volley > max || now - this.lastShot < (rapid ? RAPID_COOLDOWN : SHOT_COOLDOWN)) return
    const speed = this.shotSpeed()
    const kind: ShotKind = this.has('big') ? 'big' : 'dart'
    const spread = this.has('spread') ? [-0.2, 0, 0.2] : [0]
    for (const k of spread) this.shots.push({ x: this.shipX, y: this.shipY - 4, vx: k * speed, vy: -speed, kind, gen: 0, born: this.clock, ttl: 4000, apex: 0, dead: false })
    if (wingmen) for (const x of this.wings) this.shots.push({ x, y: this.shipY + 4 * this.shipPitch, vx: 0, vy: -speed, kind, gen: 0, born: this.clock, ttl: 4000, apex: 0, dead: false })
    this.lastShot = now
    this.cue('shot')
    this.events.onShot()
  }

  private launch(x: number, y: number) {
    if (this.shots.length >= MAX_SHOTS) return
    const speed = this.shotSpeed() * 0.55
    this.shots.push({ x, y, vx: rand(-40, 40), vy: -speed, kind: 'rocket', gen: 0, born: this.clock, ttl: 5000, apex: rand(this.h * 0.12, this.h * 0.45), dead: false })
    this.cue('rocket', x)
  }

  private shotSpeed() {
    return Math.max(620, this.h * 0.95)
  }

  private wowPulse(now: number, big: boolean) {
    const cy = this.shipCenter()
    const radius = big ? Math.max(this.w, this.h) : 170
    if (big) {
      const sparkle = this.colorIndex(COLORS.beige)
      for (let i = 0; i < this.bn; i++) this.add(this.bx[i], this.by[i], rand(-60, 60), rand(-80, 0), 400, sparkle, 1.6, now)
      this.bn = 0
    } else {
      this.clearBullets(this.shipX, cy, radius, now, false)
    }
    for (const foe of this.foes) {
      if (!this.live(foe, now)) continue
      if (Math.hypot(foe.x - this.shipX, foe.y - cy) <= radius) this.hurt(foe, big ? 2 : 1, now)
    }
    const colors = DOGE_COLORS.map((hex) => this.colorIndex(hex))
    const count = big ? 140 : 50
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2
      const v = big ? 520 : 300
      this.add(this.shipX, cy, Math.cos(a) * v, Math.sin(a) * v, big ? 900 : 500, colors[k % colors.length], big ? 2.6 : 1.8, now)
    }
    this.shake(big ? 10 : 3, big ? 650 : 220)
    this.ripple(this.shipX, cy)
    if (big) this.events.onTear(1.2)
    this.wowPulseAt = this.clock
  }

  private spawnWord(now: number) {
    const c = this.ctx
    if (!c || this.words.length >= MAX_WORDS) return
    const text = pick(DOGE_WORDS)
    const size = Math.round(this.w < 520 ? rand(15, 28) : rand(20, 42))
    c.font = `bold ${size}px ${DOGE_FONT}`
    const width = c.measureText(text).width
    const fromLeft = Math.random() < 0.5
    const x = fromLeft ? rand(-width * 0.3, this.w * 0.3) : rand(this.w * 0.7, this.w + width * 0.3)
    const y = rand(this.h * 0.35, this.h * 0.95)
    this.words.push({ text, x, y, vx: (fromLeft ? 1 : -1) * rand(40, 120), vy: -rand(50, 120), size, color: pick(DOGE_COLORS), born: now, ttl: rand(2600, 3600), w: width, tilt: rand(-0.3, 0.3), hitAt: 0 })
  }

  private updateWords(now: number, dt: number) {
    if (this.has('wow') && !this.over) {
      if (this.clock - this.wordAt > 190) {
        this.wordAt = this.clock
        this.spawnWord(now)
      }
      if (this.clock - this.wowPulseAt > 1300) this.wowPulse(now, false)
    }
    const sparkle = this.colorIndex(COLORS.beige)
    this.words = this.words.filter((word) => {
      const age = now - word.born
      if (age > word.ttl) return false
      word.x += word.vx * dt
      word.y += word.vy * dt + Math.sin(age / 180) * 0.6
      if (this.clock - word.hitAt < 110) return true
      word.hitAt = this.clock
      const hw = word.w / 2
      const hh = word.size / 2
      for (const foe of this.foes) {
        if (!this.live(foe, now)) continue
        if (Math.abs(foe.x - word.x) < hw + this.halfW(foe) * 0.6 && Math.abs(foe.y - word.y) < hh + this.halfH(foe) * 0.6) this.hurt(foe, 1, now)
      }
      for (let i = this.bn - 1; i >= 0; i--) {
        if (Math.abs(this.bx[i] - word.x) < hw && Math.abs(this.by[i] - word.y) < hh) {
          this.add(this.bx[i], this.by[i], rand(-40, 40), rand(-40, 0), 260, sparkle, 1.6, now)
          this.removeBullet(i)
        }
      }
      return true
    })
  }

  private updateShots(now: number, dt: number) {
    const homing = this.has('homing')
    const shotSpeed = this.shotSpeed()
    const trail = this.colorIndex(COLORS.warmCoral)
    const cream = this.colorIndex(COLORS.cream)
    for (const shot of this.shots) {
      if (shot.dead) continue
      if (homing && (shot.kind === 'dart' || shot.kind === 'big')) {
        let best: Foe | null = null
        let bestD = Infinity
        for (const foe of this.foes) {
          if (!this.live(foe, now) || foe.y > shot.y) continue
          const d = Math.hypot(foe.x - shot.x, foe.y - shot.y)
          if (d < bestD) {
            bestD = d
            best = foe
          }
        }
        if (best) {
          const want = ((best.x - shot.x) / Math.max(40, shot.y - best.y)) * shotSpeed
          shot.vx += (want - shot.vx) * Math.min(1, dt * 8)
        }
      }
      if (shot.kind === 'rocket') {
        shot.vy *= 1 + dt * 0.6
        shot.vx += Math.sin(this.clock / 70 + shot.born) * 30 * dt
        if (!this.reduceMotion || Math.random() < 0.3) this.add(shot.x + rand(-1.5, 1.5), shot.y + 6, rand(-20, 20), rand(30, 80), 380, Math.random() < 0.5 ? trail : cream, 1.6, now)
      } else if (shot.kind === 'spark') {
        const drag = Math.exp(-dt * 1.6)
        shot.vx *= drag
        shot.vy = shot.vy * drag + 60 * dt
        if (this.clock - shot.born > shot.ttl) {
          shot.dead = true
          continue
        }
      }
      shot.x += shot.vx * dt
      shot.y += shot.vy * dt
      if (shot.y < 30 || shot.y > this.h + 20 || shot.x < this.left - 60 || shot.x > this.left + this.field + 60) {
        if (shot.kind === 'rocket') this.rocketBurst(shot.x, Math.max(shot.y, 60), 0, now)
        shot.dead = true
        continue
      }
      if (shot.kind === 'rocket' && shot.y <= shot.apex) {
        this.rocketBurst(shot.x, shot.y, 0, now)
        shot.dead = true
        continue
      }
      if (shot.kind === 'big') {
        const dust = this.colorIndex(Math.random() < 0.25 ? COLORS.warmCoral : COLORS.beige)
        for (let k = 0; k < 2; k++) this.add(shot.x + (Math.random() - 0.5) * 12, shot.y + 10, (Math.random() - 0.5) * 60, 20 + Math.random() * 40, 420 + Math.random() * 300, dust, 1.6, now)
        for (const foe of this.foes) {
          if (!this.live(foe, now) || this.clock - foe.hitAt < 110) continue
          if (Math.abs(shot.x - foe.x) <= this.halfW(foe) + 7 && Math.abs(shot.y - foe.y) <= this.halfH(foe) + 7) {
            foe.hitAt = this.clock
            this.strike(foe, 2, now)
          }
        }
        continue
      }
      const foe = this.foeAt(shot.x, shot.y, now, shot.kind === 'spark' ? 2 : 0)
      if (!foe) continue
      shot.dead = true
      const fx = foe.x
      const fy = foe.y
      const killed = this.strike(foe, shot.kind === 'rocket' ? 3 : 1, now)
      if (shot.kind === 'rocket') this.rocketBurst(shot.x, shot.y, 0, now)
      else if (shot.kind === 'spark' && killed && shot.gen < 2) this.rocketBurst(fx, fy, shot.gen, now)
    }
    if (this.shots.some((shot) => shot.dead)) this.shots = this.shots.filter((shot) => !shot.dead)
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
        if (type === 'shield') this.shieldHp = 0
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
      while (this.rockets.length && this.rockets[0].at <= now) {
        const next = this.rockets.shift()
        if (next) this.launch(next.x, this.shipY + 10)
      }
      if (this.has('wow') && !this.reduceMotion) {
        const tint = this.colorIndex(Math.random() < 0.5 ? COLORS.warmCoral : COLORS.cream)
        const a = Math.random() * Math.PI * 2
        this.add(this.shipX + Math.cos(a) * 16, this.shipY + 10 + Math.sin(a) * 12, Math.cos(a) * 30, -40 - Math.random() * 40, 420, tint, 1.6, now)
      }
    }

    this.updateShots(now, dt)

    if (!this.over) {
      if (playing && sinceWave > READY_MS) {
        this.stepClock += dt
        if (this.stepClock >= this.interval()) {
          this.stepClock = 0
          this.stepFormation(now)
        }
      }
      this.positionFoes(now, dt)
      if (playing && sinceWave > READY_MS) {
        if (now >= this.nextRageAt) {
          this.rageOne(now)
          this.nextRageAt = now + enrageGap(this.wave) * 1000 * rand(0.6, 1.3)
        }
        this.enemyFire(now, dt)
      }
      const cy = this.shipCenter()
      for (const foe of this.foes) {
        if (foe.dead) continue
        if (foe.rage) this.updateRage(foe, now, dt)
        else if (foe.kind === 'rain' && now >= foe.spawnAt && !this.god && now >= this.invulnerableUntil && !this.has('wow') && Math.abs(foe.x - this.shipX) < this.halfW(foe) * 0.7 + this.shipPitch * 3 && Math.abs(foe.y - cy) < this.halfH(foe) * 0.7 + this.shipPitch * 3) {
          this.hitShip(now)
          this.kill(foe, now)
        }
      }
    }

    const box = { half: 3.4 * this.shipPitch, top: this.shipY + this.shipPitch, bottom: this.shipY + 10 * this.shipPitch }
    const safe = this.has('wow') || this.over || now < this.invulnerableUntil
    const minX = this.left - 10
    const maxX = this.left + this.field + 10
    for (let i = this.bn - 1; i >= 0; i--) {
      this.bx[i] += this.bvx[i] * dt
      this.by[i] += this.bvy[i] * dt
      if (this.bbounce[i] && (this.bx[i] < minX || this.bx[i] > maxX)) {
        this.bvx[i] = -this.bvx[i]
        this.bx[i] = Math.max(minX, Math.min(maxX, this.bx[i]))
        this.bbounce[i]--
      }
      if (this.by[i] > this.h + 10 || this.by[i] < -20 || this.bx[i] < -20 || this.bx[i] > this.w + 20) {
        this.removeBullet(i)
        continue
      }
      if (safe) continue
      if (Math.abs(this.bx[i] - this.shipX) < box.half && this.by[i] > box.top && this.by[i] < box.bottom) {
        this.removeBullet(i)
        this.hitShip(now)
        if (this.over) break
      }
    }

    const grab = { half: 4.5 * this.shipPitch, top: this.shipY, bottom: this.shipY + 10 * this.shipPitch }
    this.capsules = this.capsules.filter((capsule) => {
      capsule.y += CAPSULE_SPEED * dt
      if (capsule.y > this.h + 20) return false
      if (this.over) return true
      if (Math.abs(capsule.x - this.shipX) < grab.half + 12 && capsule.y > grab.top - 14 && capsule.y < grab.bottom + 10) {
        this.apply(capsule.type, now)
        return false
      }
      return true
    })

    this.updateWords(now, dt)
    if (this.arcs.length) this.arcs = this.arcs.filter((arc) => now - arc.born < ARC_MS)

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

  private dotCircle(path: Path2D, cx: number, cy: number, r: number, q: number) {
    for (let gy = -r; gy <= r; gy += q) {
      for (let gx = -r; gx <= r; gx += q) {
        if (gx * gx + gy * gy <= r * r) path.rect(cx + gx - q * 0.35, cy + gy - q * 0.35, q * 0.7, q * 0.7)
      }
    }
  }

  private paintFoes(c: CanvasRenderingContext2D, now: number) {
    const sinceWave = now - this.waveStart
    const form = Math.min(1, sinceWave / FORM_MS)
    const ease = 1 - Math.pow(1 - form, 3)
    const glitching = this.clock < this.glitchUntil && !this.reduceMotion
    const raged: Foe[] = []
    c.globalAlpha = ease
    for (const foe of this.foes) {
      if (foe.dead || now < foe.spawnAt) continue
      if (foe.rage) {
        raged.push(foe)
        continue
      }
      const art = foe.art
      const shift = glitching ? (Math.random() - 0.5) * this.size * 1.4 : 0
      const drop = foe.kind === 'grid' ? (1 - ease) * 28 : 0
      c.drawImage(art.image, foe.x - art.w / 2 + shift, foe.y - art.h / 2 - drop, art.w, art.h)
      if (this.clock < foe.flashUntil) {
        c.globalCompositeOperation = 'lighter'
        c.drawImage(art.image, foe.x - art.w / 2 + shift, foe.y - art.h / 2 - drop, art.w, art.h)
        c.globalCompositeOperation = 'source-over'
      }
      if (foe.maxHp > 2 && foe.hp < foe.maxHp && foe.kind !== 'boss') this.hpDots(c, foe.x, foe.y + art.h / 2 + 5, Math.min(60, art.w), foe.hp / foe.maxHp)
    }
    c.globalAlpha = 1
    if (!raged.length) return
    const eyes = new Path2D()
    const pupils = new Path2D()
    const brows = new Path2D()
    const cy = this.shipCenter()
    for (const foe of raged) {
      const art = foe.art
      const s = this.scaleOf(foe)
      const swelling = foe.rage === 1
      const tremble = this.reduceMotion ? 0 : swelling ? 3 : 1.5
      const jx = (Math.random() - 0.5) * tremble * 2
      const jy = (Math.random() - 0.5) * tremble * 2
      const wob = this.reduceMotion ? 0 : Math.sin(this.clock / 45) * 0.07
      const sw = art.w * s * (1 + wob)
      const sh = art.h * s * (1 - wob)
      c.drawImage(art.image, foe.x - sw / 2 + jx, foe.y - sh / 2 + jy, sw, sh)
      if (this.clock < foe.flashUntil || (swelling && Math.floor(this.clock / 80) % 2 === 0)) {
        c.globalCompositeOperation = 'lighter'
        c.globalAlpha = 0.7
        c.drawImage(art.image, foe.x - sw / 2 + jx, foe.y - sh / 2 + jy, sw, sh)
        c.globalCompositeOperation = 'source-over'
        c.globalAlpha = 1
      }
      const k = swelling ? Math.min(1, (this.clock - foe.rageAt) / SWELL_MS) : 1
      const r = Math.max(4, Math.min(sw, sh) * 0.16 * k * (1 + (this.reduceMotion ? 0 : Math.sin(this.clock / 60) * 0.12)))
      const q = Math.max(1.6, r / 4)
      const dx = this.shipX - foe.x
      const dy = cy - foe.y
      const d = Math.hypot(dx, dy) || 1
      for (const side of [-1, 1]) {
        const ex = foe.x + jx + side * sw * 0.2
        const ey = foe.y + jy - sh * 0.12
        this.dotCircle(eyes, ex, ey, r, q)
        this.dotCircle(pupils, ex + (dx / d) * r * 0.45, ey + (dy / d) * r * 0.45, r * 0.42, q * 0.8)
        for (let b = 0; b < 4; b++) {
          const t = b / 3
          brows.rect(ex + side * r * (1 - 1.6 * t) - q / 2, ey - r * (1.7 - 0.6 * t) - q / 2, q, q)
        }
      }
      if (foe.rage === 2 && foe.hp < foe.maxHp) this.hpDots(c, foe.x, foe.y + sh / 2 + 6, Math.min(90, sw), foe.hp / foe.maxHp)
    }
    c.fillStyle = COLORS.cream
    c.fill(eyes)
    c.fillStyle = COLORS.bg
    c.fill(pupils)
    c.fillStyle = COLORS.warmCoral
    c.fill(brows)
  }

  private hpDots(c: CanvasRenderingContext2D, x: number, y: number, width: number, frac: number) {
    const count = Math.max(4, Math.round(width / 5))
    const on = new Path2D()
    const off = new Path2D()
    for (let k = 0; k < count; k++) (k / count < frac ? on : off).rect(x - width / 2 + (k / count) * width, y, 2.4, 2.4)
    c.fillStyle = COLORS.warmCoral
    c.fill(on)
    c.fillStyle = INK
    c.fill(off)
  }

  private paintBullets(c: CanvasRenderingContext2D, now: number) {
    if (!this.bn) return
    const paths = SHAPES.map(() => new Path2D())
    const pitch = this.w < 520 ? 1.7 : 2
    for (let i = 0; i < this.bn; i++) {
      const shape = SHAPES[this.bshape[i]]
      const path = paths[this.bshape[i]]
      const x = this.bx[i]
      const y = this.by[i]
      if (shape === 'dot') {
        const wiggle = Math.floor((y + now * 0.05) / 6) % 2 ? 1.5 : -1.5
        for (let k = 0; k < 3; k++) path.rect(x - 1 + (k % 2 ? wiggle : -wiggle), y - k * 4, 2, 2)
        continue
      }
      const art = BULLET_ART[shape]
      for (let r = 0; r < 5; r++) {
        const line = art[r]
        for (let q = 0; q < 5; q++) if (line[q] === 'X') path.rect(x + (q - 2) * pitch - pitch * 0.4, y + (r - 2) * pitch - pitch * 0.4, pitch * 0.8, pitch * 0.8)
      }
    }
    const fills = [COLORS.beige, COLORS.warmCoral, COLORS.cream, COLORS.dustyRose]
    c.globalAlpha = 0.92
    paths.forEach((path, k) => {
      c.fillStyle = fills[k]
      c.fill(path)
    })
    c.globalAlpha = 1
  }

  private paintWords(c: CanvasRenderingContext2D, now: number) {
    if (!this.words.length) return
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    for (const word of this.words) {
      const age = now - word.born
      const fade = Math.min(1, age / 200, (word.ttl - age) / 400)
      c.save()
      c.globalAlpha = Math.max(0, fade)
      c.translate(word.x, word.y)
      c.rotate(this.reduceMotion ? word.tilt : word.tilt + Math.sin(age / 220) * 0.12)
      c.font = `bold ${word.size}px ${DOGE_FONT}`
      c.fillStyle = word.color
      c.fillText(word.text, 0, 0)
      c.restore()
    }
    c.globalAlpha = 1
  }

  private paint(now: number) {
    const c = this.ctx
    if (!c) return
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.clearRect(0, 0, this.w, this.h)
    if (this.clock < this.shakeUntil && !this.reduceMotion) {
      const k = (this.shakeUntil - this.clock) / 300
      const amp = this.shakeAmp * Math.min(1, k)
      c.translate((Math.random() - 0.5) * amp * 2, (Math.random() - 0.5) * amp * 2)
    }

    this.paintFoes(c, now)

    const boss = this.plan.formation === 'boss' ? this.foes.find((foe) => foe.kind === 'boss' && !foe.dead) : undefined
    if (boss) this.hpDots(c, this.w / 2, 80, Math.min(this.field * 0.7, 420), boss.hp / boss.maxHp)

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

    if (this.has('shield') && this.shieldHp > 0 && !this.shipDown) {
      const cy = this.shipY + (SQUID.length * this.shipPitch) / 2
      const layers = Math.min(6, this.shieldHp)
      for (let layer = 0; layer < layers; layer++) {
        const ring = new Path2D()
        const dots = 12 + layer * 4
        const rx = this.shipPitch * (9 + layer * 2.4)
        const ry = this.shipPitch * (8 + layer * 2.2)
        const spin = this.reduceMotion ? 0 : (this.clock / 500) * (layer % 2 ? -1 : 1) * (1 + layer * 0.2)
        const dot = 2 + Math.min(1.2, layers * 0.2)
        for (let k = 0; k < dots; k++) {
          const a = (k / dots) * Math.PI * 2 + spin
          ring.rect(this.shipX + Math.cos(a) * rx - dot / 2, cy + Math.sin(a) * ry - dot / 2, dot, dot)
        }
        c.fillStyle = layer === layers - 1 && layers > 2 ? COLORS.cream : layer % 2 ? '#C9C4B8' : COLORS.beige
        c.globalAlpha = Math.min(1, 0.6 + layers * 0.08)
        c.fill(ring)
      }
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
    const rockets = new Path2D()
    const sparks = new Path2D()
    for (const shot of this.shots) {
      if (shot.kind === 'big') {
        for (let gx = -2; gx <= 2; gx++) {
          for (let gy = -3; gy <= 3; gy++) {
            if (Math.abs(gx) + Math.abs(gy) > 3) continue
            shots.rect(shot.x + gx * 3.4 - 1.2, shot.y + gy * 3.4 - 1.2, 2.4, 2.4)
          }
        }
        continue
      }
      if (shot.kind === 'rocket') {
        rockets.rect(shot.x - 1.5, shot.y - 6, 3, 3)
        rockets.rect(shot.x - 1.5, shot.y - 2, 3, 3)
        rockets.rect(shot.x - 3.5, shot.y + 1, 2, 2)
        rockets.rect(shot.x + 1.5, shot.y + 1, 2, 2)
        continue
      }
      if (shot.kind === 'spark') {
        sparks.rect(shot.x - 1.3, shot.y - 1.3, 2.6, 2.6)
        sparks.rect(shot.x - shot.vx * 0.012 - 0.8, shot.y - shot.vy * 0.012 - 0.8, 1.6, 1.6)
        continue
      }
      const tilt = shot.vx / this.shotSpeed()
      shots.rect(shot.x - 1, shot.y - 3, 2, 2)
      shots.rect(shot.x - 3, shot.y - 1, 2, 2)
      shots.rect(shot.x + 1, shot.y - 1, 2, 2)
      shots.rect(shot.x - 1, shot.y + 1, 2, 2)
      inkTrail.rect(shot.x - 1 + tilt * 6, shot.y + 5, 2, 2)
      inkTrail.rect(shot.x - 1 + tilt * 10, shot.y + 9, 1.6, 1.6)
    }
    c.fillStyle = INK
    c.fill(inkTrail)
    c.fillStyle = COLORS.cream
    c.fill(shots)
    c.fillStyle = COLORS.warmCoral
    c.fill(rockets)
    c.fillStyle = COLORS.beige
    c.fill(sparks)

    this.paintBullets(c, now)

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

    this.paintWords(c, now)

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
    const gap = now - this.last
    this.last = now
    this.clock += dt * 1000
    const t0 = performance.now()
    this.update(now, dt)
    this.paint(now)
    const slot = this.frameIndex++ % PERF_FRAMES
    this.frameTimes[slot] = gap
    this.workTimes[slot] = performance.now() - t0
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
