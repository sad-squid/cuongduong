import type { HitTarget } from './Lattice'

export type Chunk =
  | { kind: 'plain'; text: string }
  | { kind: 'beam'; text: string }
  | { kind: 'glow'; text: string; level: 1 | 2 | 3 }
  | { kind: 'slot'; text: string; glyph: string }

type Word = { start: number; end: number; left: number; top: number; right: number; bottom: number }

export const SCRAMBLE_GLYPHS: Record<string, string> = {
  en: 'abcdefghijklmnopqrstuvwxyz',
  ja: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  vi: 'aăâbcdđeêghiklmnoôơpqrstuưvxyàảãáạằắặầấậèẻéẹềếệìíịòỏóọồốộờớợùủúụừứựỳýỵ',
}

const KEEP = /[\s。、,.-]/
const SHIMMER_MS = 70

const pick = (set: string) => set[Math.floor(Math.random() * set.length)]

export const segmentWords = (lang: string, text: string): [number, number][] => {
  if (lang === 'ja') {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const out: [number, number][] = []
      for (const s of new Intl.Segmenter('ja', { granularity: 'word' }).segment(text)) {
        if (s.isWordLike) out.push([s.index, s.index + s.segment.length])
      }
      if (out.length) return out
    }
    const out: [number, number][] = []
    for (let i = 0; i < text.length; i += 4) out.push([i, Math.min(text.length, i + 4)])
    return out
  }
  const out: [number, number][] = []
  for (const m of text.matchAll(/\S+/g)) out.push([m.index, m.index + m[0].length])
  return out
}

export class TaglineStore {
  private readonly reduceMotion: boolean
  private text = ''
  private lang = 'en'
  private chunks: Chunk[] = []
  private listeners = new Set<() => void>()
  private el: HTMLElement | null = null
  private words: Word[] = []
  private box: HitTarget['box'] | null = null
  private sweeping = false
  private sweepRaf = 0
  private sweepTimer = 0
  private hitRaf = 0
  private hitUntil: Float64Array = new Float64Array(0)
  private hitGlyph: string[] = []
  private hitShimmer = 0
  private onMeasured: () => void = () => {}
  private onHit: () => void = () => {}

  constructor(reduceMotion: boolean) {
    this.reduceMotion = reduceMotion
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.chunks

  attach(el: HTMLElement | null, onMeasured: () => void) {
    this.el = el
    this.onMeasured = onMeasured
  }

  setText(lang: string, text: string) {
    this.stop()
    this.lang = lang
    this.text = text
    this.chunks = [{ kind: 'plain', text }]
    this.hitUntil = new Float64Array(text.length)
    this.hitGlyph = new Array(text.length).fill('')
    this.publish()
  }

  sweep(delay = 250, duration = 2000) {
    this.stop()
    const text = this.text
    const n = text.length
    if (this.reduceMotion) {
      this.finish()
      return
    }
    this.sweeping = true
    const set = SCRAMBLE_GLYPHS[this.lang] ?? SCRAMBLE_GLYPHS.en
    const glyph = Array.from(text, (ch) => (KEEP.test(ch) ? ch : pick(set)))
    let lastShimmer = 0
    let lastFront = -2
    const start = performance.now() + delay
    const step = () => {
      const now = performance.now()
      const p = Math.max(0, Math.min(1, (now - start) / duration))
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      const front = Math.floor(eased * n)
      let changed = front !== lastFront
      if (now - lastShimmer >= SHIMMER_MS) {
        lastShimmer = now
        changed = true
        for (let i = front + 1; i < n; i++) if (!KEEP.test(text[i]) && Math.random() < 0.25) glyph[i] = pick(set)
      }
      if (changed) {
        lastFront = front
        this.chunks = this.buildSweep(front, glyph)
        this.publish()
      }
      if (p < 1) this.sweepRaf = requestAnimationFrame(step)
      else this.finish()
    }
    this.chunks = this.buildSweep(-1, glyph)
    this.publish()
    this.sweepTimer = window.setTimeout(() => {
      this.sweepRaf = requestAnimationFrame(step)
    }, delay)
  }

  hitTarget(): HitTarget | null {
    if (!this.box) return null
    return { box: this.box, test: (x, y) => this.hitAt(x, y) }
  }

  setOnHit(onHit: () => void) {
    this.onHit = onHit
  }

  scrambleGroup() {
    if (this.sweeping || this.reduceMotion || !this.words.length) return
    const start = Math.floor(Math.random() * this.words.length)
    const count = 2 + Math.floor(Math.random() * 3)
    for (const word of this.words.slice(start, start + count)) this.hitAt((word.left + word.right) / 2, (word.top + word.bottom) / 2, true)
  }

  measure() {
    const el = this.el
    if (!el || this.sweeping) return
    const nodes: [Text, number][] = []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let acc = ''
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const t = node as Text
      nodes.push([t, acc.length])
      acc += t.data
    }
    if (acc !== this.text) return
    const locate = (index: number) => {
      for (let i = nodes.length - 1; i >= 0; i--) if (index >= nodes[i][1]) return [nodes[i][0], index - nodes[i][1]] as const
      return null
    }
    const words: Word[] = []
    for (const [start, end] of segmentWords(this.lang, this.text)) {
      const a = locate(start)
      const b = locate(end - 1)
      if (!a || !b) continue
      const range = document.createRange()
      range.setStart(a[0], a[1])
      range.setEnd(b[0], b[1] + 1)
      for (const r of range.getClientRects()) words.push({ start, end, left: r.left - 2, top: r.top - 3, right: r.right + 2, bottom: r.bottom + 3 })
    }
    const r = el.getBoundingClientRect()
    this.words = words
    this.box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    this.onMeasured()
  }

  destroy() {
    this.onHit = () => {}
    this.stop()
    this.listeners.clear()
  }

  private hitAt(x: number, y: number, quiet = false) {
    if (this.sweeping || this.reduceMotion) return null
    const index = this.words.findIndex((w) => x >= w.left && x <= w.right && y >= w.top && y <= w.bottom)
    if (index < 0) return null
    const word = this.words[index]
    const set = SCRAMBLE_GLYPHS[this.lang] ?? SCRAMBLE_GLYPHS.en
    const now = performance.now()
    for (let i = word.start; i < word.end; i++) {
      if (KEEP.test(this.text[i])) continue
      this.hitUntil[i] = Math.max(this.hitUntil[i], now + 150 + Math.random() * 550)
      this.hitGlyph[i] = pick(set)
    }
    if (!this.hitRaf) this.hitRaf = requestAnimationFrame(this.hitTick)
    if (!quiet) this.onHit()
    return word.start
  }

  private hitTick = () => {
    this.hitRaf = 0
    if (this.sweeping) return
    const now = performance.now()
    const shimmer = now - this.hitShimmer >= SHIMMER_MS
    if (shimmer) this.hitShimmer = now
    const set = SCRAMBLE_GLYPHS[this.lang] ?? SCRAMBLE_GLYPHS.en
    const out: Chunk[] = []
    let active = false
    for (let i = 0; i < this.text.length; i++) {
      const until = this.hitUntil[i]
      const ch = this.text[i]
      if (until && now < until) {
        active = true
        if (shimmer && Math.random() < 0.25) this.hitGlyph[i] = pick(set)
        out.push({ kind: 'slot', text: ch, glyph: this.hitGlyph[i] })
      } else if (until && now < until + 90) {
        active = true
        out.push({ kind: 'beam', text: ch })
      } else if (until && now < until + 420) {
        active = true
        out.push({ kind: 'glow', text: ch, level: now < until + 200 ? 1 : now < until + 310 ? 2 : 3 })
      } else {
        if (until) this.hitUntil[i] = 0
        this.pushPlain(out, ch)
      }
    }
    this.chunks = active ? out : [{ kind: 'plain', text: this.text }]
    this.publish()
    if (active) this.hitRaf = requestAnimationFrame(this.hitTick)
  }

  private buildSweep(front: number, glyph: string[]) {
    const text = this.text
    const out: Chunk[] = []
    if (front < 0) {
      for (let i = 0; i < text.length; i++) {
        if (/\s/.test(text[i])) this.pushPlain(out, text[i])
        else out.push({ kind: 'slot', text: text[i], glyph: glyph[i] })
      }
      return out
    }
    const glowFrom = Math.max(0, front - 3)
    this.pushPlain(out, text.slice(0, glowFrom))
    for (let i = glowFrom; i < front; i++) {
      if (/\s/.test(text[i])) this.pushPlain(out, text[i])
      else out.push({ kind: 'glow', text: text[i], level: (front - i) as 1 | 2 | 3 })
    }
    if (front < text.length) out.push({ kind: 'beam', text: text[front] })
    for (let i = front + 1; i < text.length; i++) {
      if (/\s/.test(text[i])) this.pushPlain(out, text[i])
      else out.push({ kind: 'slot', text: text[i], glyph: glyph[i] })
    }
    return out
  }

  private pushPlain(out: Chunk[], text: string) {
    if (!text) return
    const last = out[out.length - 1]
    if (last && last.kind === 'plain') out[out.length - 1] = { kind: 'plain', text: last.text + text }
    else out.push({ kind: 'plain', text })
  }

  private finish() {
    this.sweeping = false
    this.chunks = [{ kind: 'plain', text: this.text }]
    this.publish()
    requestAnimationFrame(() => this.measure())
  }

  private stop() {
    window.clearTimeout(this.sweepTimer)
    cancelAnimationFrame(this.sweepRaf)
    cancelAnimationFrame(this.hitRaf)
    this.hitRaf = 0
    this.sweeping = false
    this.hitUntil.fill(0)
  }

  private publish() {
    for (const listener of this.listeners) listener()
  }
}
