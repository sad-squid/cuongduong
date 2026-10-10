export type LogLine = { key: number; text: string; opacity: number; human: boolean }

const VISIBLE = 7
const QUIET_MS = 3000

export class LogStore {
  private readonly reduceMotion: boolean
  private actions: string[] = []
  private idle: string[] = []
  private done: string[] = []
  private partial: string | null = null
  private typing = false
  private lastActivity = performance.now()
  private typer = 0
  private pumpTimer = 0
  private snapshot: LogLine[] = []
  private listeners = new Set<() => void>()

  constructor(reduceMotion: boolean) {
    this.reduceMotion = reduceMotion
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  log(action: boolean, text: string) {
    if (this.reduceMotion) {
      this.done = [...this.done, text].slice(-VISIBLE)
      this.publish()
      return
    }
    ;(action ? this.actions : this.idle).push(text)
    this.pump()
  }

  activity() {
    this.lastActivity = performance.now()
    if (this.idle.length && !this.typing) this.schedulePump(QUIET_MS)
  }

  reset() {
    window.clearTimeout(this.typer)
    window.clearTimeout(this.pumpTimer)
    this.actions = []
    this.idle = []
    this.done = []
    this.partial = null
    this.typing = false
    this.lastActivity = performance.now()
    this.publish()
  }

  destroy() {
    window.clearTimeout(this.typer)
    window.clearTimeout(this.pumpTimer)
    this.listeners.clear()
  }

  private schedulePump(ms: number) {
    window.clearTimeout(this.pumpTimer)
    this.pumpTimer = window.setTimeout(() => this.pump(), ms)
  }

  private pump() {
    if (this.typing) return
    const now = performance.now()
    const next = this.actions.length
      ? this.actions.shift()
      : this.idle.length && now - this.lastActivity >= QUIET_MS
        ? this.idle.shift()
        : undefined
    if (next === undefined) {
      if (this.idle.length) this.schedulePump(Math.max(50, this.lastActivity + QUIET_MS - now))
      return
    }
    this.type(next)
  }

  private type(line: string) {
    this.typing = true
    let i = 0
    const step = () => {
      if (i <= line.length) {
        this.partial = line.slice(0, i) + (i < line.length ? '_' : '')
        this.publish()
        i += 2
        this.typer = window.setTimeout(step, 22 + Math.random() * 26)
        return
      }
      this.done = [...this.done, line].slice(-VISIBLE)
      this.partial = null
      this.typing = false
      this.publish()
      this.typer = window.setTimeout(() => this.pump(), 380)
    }
    step()
  }

  private publish() {
    const shown = [...this.done, ...(this.partial === null ? [] : [this.partial])].slice(-VISIBLE)
    this.snapshot = shown.map((text, i) => ({
      key: i,
      text,
      opacity: 0.25 + (0.75 * (i + 1)) / shown.length,
      human: /^(gate|pulse)/.test(text),
    }))
    for (const listener of this.listeners) listener()
  }
}
