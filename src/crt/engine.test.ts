import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CrtController } from './CrtController'
import { Lattice } from './Lattice'
import { LogStore } from './LogStore'
import { NameField } from './NameField'
import { TaglineStore, segmentWords } from './TaglineStore'

let now = 0
let frames: FrameRequestCallback[] = []
let timers: { id: number; at: number; fn: () => void }[] = []
let timerId = 0

const fakeContext = () => ({
  setTransform: () => {},
  clearRect: () => {},
  fillRect: () => {},
  fill: () => {},
  drawImage: () => {},
  fillText: () => {},
  measureText: (text: string) => ({ width: text.length * 38 }),
  getImageData: (_x: number, _y: number, w: number, h: number) => {
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 3; i < data.length; i += 4) data[i] = (i >> 2) % 3 === 0 ? 255 : 0
    return { data }
  },
  canvas: { width: 0, height: 0 },
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  fillStyle: '',
  font: '',
  textAlign: 'left',
  textBaseline: 'alphabetic',
})

const fakeCanvas = (width: number, height: number) =>
  ({
    width: 0,
    height: 0,
    getContext: () => fakeContext(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0 }),
  }) as unknown as HTMLCanvasElement

const advance = (ms: number, steps = 1) => {
  for (let s = 0; s < steps; s++) {
    now += ms
    const due = timers.filter((t) => t.at <= now)
    timers = timers.filter((t) => t.at > now)
    due.forEach((t) => t.fn())
    const queue = frames
    frames = []
    queue.forEach((f) => f(now))
  }
}

beforeEach(() => {
  now = 0
  frames = []
  timers = []
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f))
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.stubGlobal(
    'Path2D',
    class {
      rect() {}
    },
  )
  const setTimeoutStub = (fn: () => void, ms = 0) => {
    timerId += 1
    timers.push({ id: timerId, at: now + ms, fn })
    return timerId
  }
  const clearTimeoutStub = (id: number) => {
    timers = timers.filter((t) => t.id !== id)
  }
  vi.stubGlobal('window', {
    devicePixelRatio: 2,
    innerHeight: 800,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: setTimeoutStub,
    clearTimeout: clearTimeoutStub,
  })
  vi.stubGlobal('document', { createElement: () => fakeCanvas(10, 10) })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Lattice', () => {
  const ready = () => {
    const lattice = new Lattice(fakeCanvas(1280, 800), false, () => {})
    lattice.setup()
    lattice.enable()
    return lattice
  }

  it('cleans up every loose point and moving dot after a blast', () => {
    const lattice = ready()
    lattice.impulse(640, 300, 240, 16)
    for (let k = 0; k < 60; k++) lattice.addSpark(640, 300, Math.cos(k) * 10, Math.sin(k) * 10)
    expect(lattice.sparks).toBe(60)
    expect(lattice.movingDots).toBeGreaterThan(0)
    advance(16, 500)
    expect(lattice.sparks).toBe(0)
    expect(lattice.movingDots).toBe(0)
    expect(lattice.isRunning).toBe(false)
  })

  it('caps loose points at 600', () => {
    const lattice = ready()
    for (let k = 0; k < 2000; k++) lattice.addSpark(640, 300, 10, 0)
    expect(lattice.sparks).toBe(600)
  })

  it('stays idle until enabled', () => {
    const lattice = new Lattice(fakeCanvas(1280, 800), false, () => {})
    lattice.setup()
    lattice.impulse(640, 300, 240, 16)
    expect(lattice.isRunning).toBe(false)
  })

  it('reports a word hit and removes the point that caused it', () => {
    const lattice = ready()
    const test = vi.fn(() => 3)
    lattice.setHitTarget({ box: { left: 600, top: 280, right: 700, bottom: 320 }, test })
    lattice.addSpark(560, 300, 12, 0)
    advance(16, 10)
    expect(test).toHaveBeenCalled()
    expect(lattice.sparks).toBe(0)
  })
})

describe('NameField', () => {
  it('generates, settles, and reports the result once', () => {
    const settled = vi.fn()
    const field = new NameField(fakeCanvas(1280, 520), false, { onFrame: () => {}, onStep: () => {}, onSettled: settled, onPerturbed: () => {} })
    field.setup()
    field.generate('Cuong', true, null)
    expect(field.isDiffusing).toBe(true)
    advance(16, 120)
    expect(field.isDiffusing).toBe(false)
    expect(settled).toHaveBeenCalledTimes(1)
    expect(settled.mock.calls[0][0].points).toBeGreaterThan(0)
  })

  it('does not report a disturbance nobody caused', () => {
    const perturbed = vi.fn()
    const field = new NameField(fakeCanvas(1400, 520), false, { onFrame: () => {}, onStep: () => {}, onSettled: () => {}, onPerturbed: perturbed })
    field.setup()
    field.generate('Cuong', true, { left: 0, top: 0, spacing: 12 })
    advance(16, 300)
    expect(perturbed).not.toHaveBeenCalled()
  })

  it('ignores the pointer far away from the letters', () => {
    const field = new NameField(fakeCanvas(1280, 520), false, { onFrame: () => {}, onStep: () => {}, onSettled: () => {}, onPerturbed: () => {} })
    field.setup()
    field.generate('Cuong', false, null)
    advance(16, 80)
    expect(field.pointer(5, 5)).toBe(false)
  })

  it('snaps straight to the name with reduced motion', () => {
    const settled = vi.fn()
    const field = new NameField(fakeCanvas(1280, 520), true, { onFrame: () => {}, onStep: () => {}, onSettled: settled, onPerturbed: () => {} })
    field.setup()
    field.generate('Cuong', true, null)
    expect(field.isDiffusing).toBe(false)
    expect(settled).toHaveBeenCalledWith(expect.objectContaining({ steps: 0 }))
  })
})

describe('CrtController', () => {
  it('emits one pulse per blast window and counts distinct words', () => {
    const controller = new CrtController(false)
    const events: string[] = []
    controller.subscribe((e) => {
      if (e.type === 'pulse') events.push(`${e.words}`)
    })
    controller.mount(fakeCanvas(1280, 800), fakeCanvas(1280, 800))
    controller.reveal()
    controller.blast(640, 300)
    controller.blast(650, 300)
    advance(16, 100)
    expect(events).toHaveLength(1)
    controller.unmount()
  })
})

describe('reveal ordering', () => {
  it('honours a reveal requested before the lattice is mounted', () => {
    const controller = new CrtController(false)
    controller.reveal()
    expect(controller.isRevealed).toBe(true)
    controller.mount(fakeCanvas(1280, 800), fakeCanvas(1280, 800))
    controller.blast(640, 300)
    advance(16, 2)
    expect(controller.isRevealed).toBe(true)
    controller.unmount()
  })
})

describe('heading handoff', () => {
  it('flies the leaving heading into the arriving one and settles once', () => {
    const controller = new CrtController(false)
    controller.mount(fakeCanvas(1280, 800), fakeCanvas(1280, 800))
    const noop = { onFrame: () => {}, onStep: () => {}, onPerturbed: () => {} }
    const first = new NameField(fakeCanvas(1280, 520), false, { ...noop, onSettled: () => {} })
    first.setup()
    first.generate('Cuong', false, null)
    advance(16, 80)
    controller.release(first)
    const settled = vi.fn()
    const next = new NameField(fakeCanvas(1280, 520), false, { ...noop, onSettled: settled })
    next.setup()
    controller.introduce(next, 'About')
    expect(next.isDiffusing).toBe(false)
    advance(16, 120)
    expect(settled).toHaveBeenCalledTimes(1)
    expect(settled.mock.calls[0][0].carried).toBe(true)
    controller.unmount()
  })

  it('falls back to the lattice intro without a fresh handoff', () => {
    const controller = new CrtController(false)
    controller.mount(fakeCanvas(1280, 800), fakeCanvas(1280, 800))
    const field = new NameField(fakeCanvas(1280, 520), false, { onFrame: () => {}, onStep: () => {}, onSettled: () => {}, onPerturbed: () => {} })
    field.setup()
    controller.introduce(field, 'Work')
    expect(field.isDiffusing).toBe(true)
    controller.unmount()
  })
})

describe('review regressions', () => {
  const noop = { onFrame: () => {}, onStep: () => {}, onPerturbed: () => {} }
  const settledField = (controller: CrtController, text: string, onSettled = () => {}) => {
    const field = new NameField(fakeCanvas(1280, 520), false, { ...noop, onSettled })
    field.setup()
    controller.introduce(field, text)
    advance(16, 120)
    return field
  }

  it('replay plays the lattice intro, not a carry flight', () => {
    const controller = new CrtController(false)
    controller.mount(fakeCanvas(1280, 800), fakeCanvas(1280, 800))
    const before = settledField(controller, 'Cuong')
    controller.replay()
    controller.release(before)
    const after = new NameField(fakeCanvas(1280, 520), false, { ...noop, onSettled: () => {} })
    after.setup()
    controller.introduce(after, 'Cuong')
    expect(after.isDiffusing).toBe(true)
    controller.unmount()
  })

  it('leaving mid-flight aborts the flight and hands its points on', () => {
    const controller = new CrtController(false)
    controller.mount(fakeCanvas(1280, 800), fakeCanvas(1280, 800))
    controller.release(settledField(controller, 'Cuong'))
    const aboutSettled = vi.fn()
    const about = new NameField(fakeCanvas(1280, 520), false, { ...noop, onSettled: aboutSettled })
    about.setup()
    controller.introduce(about, 'About')
    advance(16, 10)
    controller.release(about)
    const work = new NameField(fakeCanvas(1280, 520), false, { ...noop, onSettled: () => {} })
    work.setup()
    controller.introduce(work, 'Work')
    expect(work.isDiffusing).toBe(false)
    advance(16, 120)
    expect(aboutSettled).not.toHaveBeenCalled()
    controller.unmount()
  })

  it('queues a regenerate that arrives before the heading is ready', () => {
    const controller = new CrtController(false)
    controller.mount(fakeCanvas(1280, 800), fakeCanvas(1280, 800))
    const settled = vi.fn()
    const field = new NameField(fakeCanvas(1280, 520), false, { ...noop, onSettled: settled })
    field.setup()
    controller.introduce(field, 'Cuong')
    advance(16, 5)
    controller.regenerate(field, 'Cường')
    advance(16, 200)
    expect(settled).toHaveBeenCalledTimes(2)
    controller.unmount()
  })
})

describe('LogStore', () => {
  it('types actions immediately and holds idle lines for a 3s pause', () => {
    const log = new LogStore(false)
    log.log(true, 'pulse    click')
    log.log(false, 'note     idle')
    advance(50, 40)
    expect(log.getSnapshot().map((l) => l.text)).toEqual(['pulse    click'])
    log.activity()
    advance(50, 50)
    expect(log.getSnapshot().some((l) => l.text.startsWith('note'))).toBe(false)
    advance(50, 80)
    expect(log.getSnapshot().map((l) => l.text)).toContain('note     idle')
    expect(log.getSnapshot()[0].human).toBe(true)
  })
})

describe('LogStore backlog', () => {
  it('keeps up with rapid actions: finishes the current line and types only the newest', () => {
    const log = new LogStore(false)
    log.log(true, 'request  first event with a long line of text to type out')
    advance(30, 2)
    log.log(true, 'pulse    second')
    log.log(true, 'pulse    third')
    log.log(true, 'pulse    newest')
    const texts = () => log.getSnapshot().map((l) => l.text)
    expect(texts()).toContain('request  first event with a long line of text to type out')
    expect(texts()).toContain('pulse    second')
    expect(texts()).toContain('pulse    third')
    advance(50, 40)
    expect(texts()[texts().length - 1]).toBe('pulse    newest')
  })
})

describe('TaglineStore', () => {
  it('splits words per language', () => {
    expect(segmentWords('en', 'Software engineer in Tokyo')).toHaveLength(4)
    expect(segmentWords('ja', '東京を拠点とする').length).toBeGreaterThan(1)
  })

  it('sweeps to plain text and never changes the characters underneath', () => {
    const store = new TaglineStore(false)
    store.setText('en', 'Software engineer')
    store.sweep(0, 400)
    advance(16, 5)
    const mid = store.getSnapshot()
    expect(mid.map((c) => c.text).join('')).toBe('Software engineer')
    advance(16, 40)
    expect(store.getSnapshot()).toEqual([{ kind: 'plain', text: 'Software engineer' }])
  })
})
