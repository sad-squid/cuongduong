import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Home } from '@/pages/Home'
import { About } from '@/pages/About'
import { Work } from '@/pages/Work'
import { SectionDots } from '@/components/SectionDots'
import { ScrollHint } from '@/components/ScrollHint'
import { useCrt } from '@/crt/context'
import { STACK, SectionContext, nearestStop, pageStops, regionsOf, sectionTop, stackIndex, stepStop, type Stop } from './section'

const PAGES = [Home, About, Work]
const ARM_LINE = 0.92
const ACTIVE_LINE = 0.4
const SYNC_MS = 1500
const AWAKE_MS = 1400
const LIFT_MS = 160
const LINE_PX = 16

const PAGE_MS = 500
const RETURN_MS = 320
const STEER_SLACK_MS = 300
const SETTLE_MS = 160

const WHEEL_GAP_MS = 120
const WHEEL_TRIGGER_PX = 12
const WHEEL_RISE = 2.5
const WHEEL_RISE_PX = 6
const WHEEL_DECAYED = 0.5

const TOUCH_SLOP = 10
const TOUCH_SHARE = 0.12
const FLING_PX_MS = 0.4
const FLING_WINDOW_MS = 100
const HOLD_MS = 320
const HOLD_SKIP = 'a, button, input, textarea, select, label, [role="dialog"], [data-no-blast], p, li, dl, h2, h3'

const NATIVE = '.palette, .arcade, [role="dialog"]'
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
const PRESSABLE = 'button, a[href], summary, [role="button"]'

const KEYS: Record<string, number> = { PageDown: 1, PageUp: -1, ArrowDown: 1, ArrowUp: -1 }

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t: number) => 1 - (1 - t) ** 3

const scrollsInside = (target: EventTarget | null, dy: number) => {
  for (let el = target instanceof Element ? target : null; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight + 1) continue
    const overflow = getComputedStyle(el).overflowY
    if (overflow !== 'auto' && overflow !== 'scroll') continue
    if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true
  }
  return false
}

const nativeTarget = (target: EventTarget | null) => target instanceof Element && target.closest(NATIVE) !== null

const gamePlaying = () => document.querySelector('.screen.playing') !== null

export const Stack = () => {
  const crt = useCrt()
  const router = useRouter()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const [initial] = useState(() => Math.max(0, stackIndex(path)))
  const [active, setActive] = useState(initial)
  const [armed, setArmed] = useState(() => STACK.map((_, i) => i === initial))
  const [awake, setAwake] = useState(false)
  const activeRef = useRef(initial)
  const steering = useRef<{ index: number; until: number } | null>(null)
  const synced = useRef(new Map<string, number>())
  const touched = useRef(false)
  const motion = useRef<{ frame: number; to: number } | null>(null)

  const states = useMemo(() => STACK.map((_, i) => ({ active: i === active, armed: armed[i] })), [active, armed])

  const stops = () => pageStops(regionsOf(sectionRefs.current), window.innerHeight)

  const halt = () => {
    if (motion.current) cancelAnimationFrame(motion.current.frame)
    motion.current = null
  }

  const glide = (stop: Stop, ms: number, ease: (t: number) => number) => {
    halt()
    const from = window.scrollY
    const to = stop.y
    steering.current = { index: stop.section, until: performance.now() + ms + STEER_SLACK_MS }
    if (crt.reduceMotion || ms <= 0 || Math.abs(to - from) < 1) {
      window.scrollTo({ top: to, behavior: 'instant' })
      return
    }
    const start = performance.now()
    const run = { frame: 0, to }
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      window.scrollTo({ top: from + (to - from) * ease(t), behavior: 'instant' })
      if (t < 1) run.frame = requestAnimationFrame(tick)
      else if (motion.current === run) motion.current = null
    }
    run.frame = requestAnimationFrame(tick)
    motion.current = run
  }

  const moving = () => motion.current !== null

  const turn = (dir: number) => {
    const all = stops()
    const k = stepStop(all, window.scrollY, dir)
    if (k !== null) glide(all[k], PAGE_MS, easeInOut)
    return k !== null
  }

  const scrollToSection = (index: number, smooth: boolean) => {
    const top = sectionTop(sectionRefs.current[index], index)
    glide({ y: top, section: index }, smooth ? PAGE_MS : 0, easeInOut)
  }

  const settle = useEffectEvent((index: number) => {
    if (index > 0 && Math.abs(window.scrollY - sectionTop(sectionRefs.current[index], index)) > 2) scrollToSection(index, false)
  })

  const settleNearest = useEffectEvent(() => {
    if (moving() || gamePlaying()) return
    const all = stops()
    const k = nearestStop(all, window.scrollY)
    if (Math.abs(all[k].y - window.scrollY) > 1) glide(all[k], RETURN_MS, easeOut)
  })

  const snapNearest = useEffectEvent(() => {
    const all = stops()
    glide(all[nearestStop(all, window.scrollY)], 0, easeOut)
  })

  const measure = useEffectEvent(() => {
    const vh = window.innerHeight
    const rects = sectionRefs.current.map((el) => el?.getBoundingClientRect() ?? null)
    setArmed((prev) => {
      const next = prev.map((on, i) => {
        const r = rects[i]
        return on || (r !== null && r.top < vh * ARM_LINE && r.bottom > 0)
      })
      return next.some((on, i) => on !== prev[i]) ? next : prev
    })
    let current = 0
    rects.forEach((r, i) => {
      if (r && r.top <= vh * ACTIVE_LINE) current = i
    })
    if (vh + window.scrollY >= document.documentElement.scrollHeight - 2) current = STACK.length - 1
    const steer = steering.current
    if (steer) {
      if (current !== steer.index && performance.now() < steer.until) return
      steering.current = null
    }
    activeRef.current = current
    setActive(current)
  })

  const onWheelPage = useEffectEvent((e: WheelEvent, wheel: WheelState) => {
    const now = performance.now()
    const d = e.deltaY * (e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? window.innerHeight : 1)
    const size = Math.abs(d)
    const flipped = Math.sign(d) !== Math.sign(wheel.lastDelta)
    const fresh = now - wheel.last > WHEEL_GAP_MS || (flipped && !moving())
    const rose = wheel.fired && !moving() && wheel.low <= wheel.peak * WHEEL_DECAYED && size >= wheel.low * WHEEL_RISE + WHEEL_RISE_PX
    wheel.last = now
    wheel.lastDelta = d
    if (fresh || rose) {
      wheel.fired = false
      wheel.sum = 0
      wheel.peak = size
      wheel.low = size
    } else if (size > wheel.peak) {
      wheel.peak = size
      wheel.low = size
    } else wheel.low = Math.min(wheel.low, size)
    if (wheel.fired) return
    if (moving()) {
      wheel.fired = true
      return
    }
    wheel.sum += d
    if (Math.abs(wheel.sum) < WHEEL_TRIGGER_PX) return
    wheel.fired = true
    turn(Math.sign(wheel.sum))
  })

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    const space = e.key === ' ' || e.key === 'Spacebar'
    const dir = space ? (e.shiftKey ? -1 : 1) : KEYS[e.key]
    if (!dir) return
    const target = e.target instanceof Element ? e.target : null
    if (target?.closest(TYPING) || target?.closest(NATIVE) || gamePlaying() || document.querySelector(NATIVE)) return
    if (space && target?.closest(PRESSABLE)) return
    if (scrollsInside(target, dir)) return
    e.preventDefault()
    touched.current = true
    if (!moving()) turn(dir)
  })

  const onTouchRelease = useEffectEvent((touch: TouchState) => {
    const all = stops()
    const vh = window.innerHeight
    const recent = touch.samples.filter((s) => touch.samples[touch.samples.length - 1].t - s.t <= FLING_WINDOW_MS)
    const first = recent[0]
    const last = recent[recent.length - 1]
    const idle = performance.now() - last.t > FLING_WINDOW_MS
    const velocity = idle || last.t === first.t ? 0 : (last.y - first.y) / (last.t - first.t)
    const pulled = touch.y0 - last.y
    let dir = 0
    if (Math.abs(velocity) >= FLING_PX_MS) dir = velocity < 0 ? 1 : -1
    else if (Math.abs(pulled) >= vh * TOUCH_SHARE) dir = Math.sign(pulled)
    const k = Math.max(0, Math.min(all.length - 1, touch.origin + dir))
    const target = all[k] ?? all[nearestStop(all, window.scrollY)]
    glide(target, k === touch.origin ? RETURN_MS : PAGE_MS, easeOut)
  })

  const springBack = useEffectEvent((touch: TouchState) => {
    const all = stops()
    glide(all[Math.min(touch.origin, all.length - 1)], RETURN_MS, easeOut)
  })

  const onTouchDrag = useEffectEvent((touch: TouchState, y: number) => {
    const all = stops()
    const low = all[Math.max(0, touch.origin - 1)].y
    const high = all[Math.min(all.length - 1, touch.origin + 1)].y
    window.scrollTo({ top: Math.max(low, Math.min(high, touch.scroll0 + touch.y0 - y)), behavior: 'instant' })
  })

  const onTouchBegin = useEffectEvent((e: TouchEvent): TouchState | null => {
    const finger = e.touches[0]
    if (e.touches.length !== 1 || !finger || nativeTarget(e.target) || gamePlaying()) return null
    const all = stops()
    const target = e.target instanceof Element ? e.target : null
    const holdable = !crt.reduceMotion && !(target?.closest(HOLD_SKIP) && !target.closest('[data-blast]'))
    return {
      x0: finger.clientX,
      y0: finger.clientY,
      t0: performance.now(),
      scroll0: window.scrollY,
      origin: nearestStop(all, window.scrollY),
      mode: moving() ? 'swallow' : 'pending',
      holdable,
      target: e.target,
      samples: [{ y: finger.clientY, t: performance.now() }],
    }
  })

  useLayoutEffect(() => {
    settle(initial)
  }, [initial])

  useEffect(() => {
    let frame = 0
    let awakeTimer = 0
    let liftTimer = 0
    let settleTimer = 0
    let resizeTimer = 0
    let fingers = 0
    let touch: TouchState | null = null
    const wheel: WheelState = { last: 0, lastDelta: 0, sum: 0, fired: false, peak: 0, low: 0 }

    const scheduleSettle = () => {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        if (fingers > 0 || moving()) return
        settleNearest()
      }, SETTLE_MS)
    }
    const onScroll = () => {
      if (!moving() && !(touch && touch.mode === 'drag')) scheduleSettle()
      setAwake(true)
      window.clearTimeout(awakeTimer)
      awakeTimer = window.setTimeout(() => setAwake(false), AWAKE_MS)
      window.clearTimeout(liftTimer)
      liftTimer = window.setTimeout(() => crt.liftName(), LIFT_MS)
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          measure()
        })
    }
    const onResize = () => {
      onScroll()
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        if (!moving() && fingers === 0) snapNearest()
      }, SETTLE_MS)
    }
    const onTouchStart = (e: TouchEvent) => {
      touched.current = true
      fingers = e.touches.length
      if (touch?.mode === 'drag' && fingers > 1) {
        springBack(touch)
        touch = null
        return
      }
      touch = fingers === 1 ? onTouchBegin(e) : null
    }
    const onTouchMove = (e: TouchEvent) => {
      const finger = e.touches[0]
      if (!touch || !finger || e.touches.length !== 1) return
      if (touch.mode === 'free') return
      if (touch.mode === 'swallow') {
        if (e.cancelable) e.preventDefault()
        return
      }
      const now = performance.now()
      const dx = finger.clientX - touch.x0
      const dy = finger.clientY - touch.y0
      if (touch.mode === 'pending') {
        const far = Math.hypot(dx, dy) > TOUCH_SLOP
        if (touch.holdable && now - touch.t0 >= HOLD_MS) {
          touch.mode = 'free'
          return
        }
        if (!far) {
          if (e.cancelable) e.preventDefault()
          return
        }
        if (Math.abs(dx) > Math.abs(dy) || scrollsInside(touch.target, -dy)) {
          touch.mode = 'free'
          return
        }
        touch.mode = 'drag'
      }
      if (e.cancelable) e.preventDefault()
      touch.samples.push({ y: finger.clientY, t: now })
      if (touch.samples.length > 12) touch.samples.shift()
      onTouchDrag(touch, finger.clientY)
    }
    const onTouchEnd = (e: TouchEvent) => {
      fingers = e.touches.length
      const done = touch
      if (fingers > 0) return
      touch = null
      if (done?.mode === 'drag') onTouchRelease(done)
      else scheduleSettle()
    }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (nativeTarget(e.target) || gamePlaying() || scrollsInside(e.target, e.deltaY)) return
      touched.current = true
      e.preventDefault()
      onWheelPage(e, wheel)
    }
    const onKeyDown = (e: KeyboardEvent) => onKey(e)

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    document.fonts?.ready.then(() => {
      if (!touched.current) settle(activeRef.current)
    })
    return () => {
      cancelAnimationFrame(frame)
      halt()
      window.clearTimeout(awakeTimer)
      window.clearTimeout(liftTimer)
      window.clearTimeout(settleTimer)
      window.clearTimeout(resizeTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [crt])

  useEffect(() => {
    const target = STACK[active].path
    if (router.state.location.pathname === target) return
    synced.current.set(target, performance.now())
    router.navigate({ to: target, replace: true, resetScroll: false })
  }, [active, router])

  const follow = useEffectEvent((next: string) => {
    const index = stackIndex(next)
    const at = synced.current.get(next)
    synced.current.delete(next)
    if (index < 0 || index === activeRef.current || (at !== undefined && performance.now() - at < SYNC_MS)) return
    scrollToSection(index, true)
  })

  useEffect(() => {
    follow(path)
  }, [path])

  return (
    <div className="stack">
      {PAGES.map((Page, i) => (
        <div
          key={STACK[i].path}
          ref={(el) => {
            sectionRefs.current[i] = el
          }}
          className={`stack-section stack-${STACK[i].key}${i === active ? ' active' : ''}`}
        >
          <SectionContext.Provider value={states[i]}>
            <Page />
          </SectionContext.Provider>
          {i === 0 ? <ScrollHint onClick={() => scrollToSection(1, true)} /> : null}
        </div>
      ))}
      <SectionDots active={active} awake={awake} onSelect={(index) => scrollToSection(index, true)} />
    </div>
  )
}

type WheelState = { last: number; lastDelta: number; sum: number; fired: boolean; peak: number; low: number }

type TouchState = {
  x0: number
  y0: number
  t0: number
  scroll0: number
  origin: number
  mode: 'pending' | 'drag' | 'free' | 'swallow'
  holdable: boolean
  target: EventTarget | null
  samples: { y: number; t: number }[]
}
