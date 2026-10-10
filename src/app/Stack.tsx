import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Home } from '@/pages/Home'
import { About } from '@/pages/About'
import { Work } from '@/pages/Work'
import { SectionDots } from '@/components/SectionDots'
import { ScrollHint } from '@/components/ScrollHint'
import { useCrt } from '@/crt/context'
import { STACK, SectionContext, regionsOf, sectionAt, sectionTop, stackIndex } from './section'

const PAGES = [Home, About, Work]
const ARM_LINE = 0.92
const ACTIVE_LINE = 0.4
const STEER_MS = 1400
const SYNC_MS = 1500
const AWAKE_MS = 1400
const LIFT_MS = 160
const TURN_MS = 700
const GESTURE_GAP_MS = 220
const LINE_PX = 16
const TURN_PX = 24

const SETTLE_MS = 140
const SETTLE_SHARE = 0.18

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
  const settledAt = useRef(0)

  const states = useMemo(() => STACK.map((_, i) => ({ active: i === active, armed: armed[i] })), [active, armed])

  const steerTo = (index: number, top: number, smooth: boolean) => {
    steering.current = { index, until: performance.now() + STEER_MS }
    settledAt.current = top
    window.scrollTo({ top, behavior: smooth && !crt.reduceMotion ? 'smooth' : 'instant' })
  }

  const scrollToSection = (index: number, smooth: boolean) => steerTo(index, sectionTop(sectionRefs.current[index], index), smooth)

  const page = useEffectEvent((e: WheelEvent, state: { lockUntil: number; held: boolean; push: number }) => {
    const vh = window.innerHeight
    const y = window.scrollY
    const last = STACK.length - 1
    const bounds = regionsOf(sectionRefs.current)
    const i = sectionAt(bounds, y)
    const delta = e.deltaY * (e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? vh : 1)
    const turn = (index: number, top: number) => {
      state.lockUntil = performance.now() + TURN_MS
      state.held = true
      steerTo(index, top, true)
    }
    if (delta > 0) {
      if (y >= bounds[i].end - 1) {
        e.preventDefault()
        state.push = Math.max(0, state.push) + delta
        if (i < last && state.push >= TURN_PX) turn(i + 1, bounds[i + 1].top)
        return
      }
      if (y + delta > bounds[i].end) {
        e.preventDefault()
        state.held = true
        window.scrollTo({ top: bounds[i].end, behavior: 'instant' })
      }
      return
    }
    if (y <= bounds[i].top + 1) {
      e.preventDefault()
      state.push = Math.min(0, state.push) + delta
      if (i > 0 && state.push <= -TURN_PX) turn(i - 1, bounds[i - 1].end)
      return
    }
    if (y + delta < bounds[i].top) {
      e.preventDefault()
      state.held = true
      window.scrollTo({ top: bounds[i].top, behavior: 'instant' })
    }
  })

  const settle = useEffectEvent((index: number) => {
    if (index > 0 && Math.abs(window.scrollY - sectionTop(sectionRefs.current[index], index)) > 2) scrollToSection(index, false)
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

  const settleScroll = useEffectEvent((from: number) => {
    if (steering.current && performance.now() < steering.current.until) return
    const y = window.scrollY
    const regions = regionsOf(sectionRefs.current)
    const origin = sectionAt(regions, from)
    const k = sectionAt(regions, y)
    const threshold = window.innerHeight * SETTLE_SHARE
    const go = (index: number, top: number) => {
      if (Math.abs(top - y) > 1) steerTo(index, top, true)
    }
    if (y <= regions[k].end + 1) {
      if (k > origin) go(origin + 1, regions[origin + 1].top)
      else if (k < origin) go(origin - 1, regions[origin - 1].end)
      return
    }
    const next = regions[k + 1]
    if (!next) return
    if (k + 1 > origin + 1) return go(origin + 1, regions[origin + 1].top)
    if (k < origin - 1) return go(origin - 1, regions[origin - 1].end)
    const down = y > from || (y === from && y - regions[k].end > next.top - y)
    if (down) {
      if (y - regions[k].end > threshold) go(k + 1, next.top)
      else go(k, regions[k].end)
      return
    }
    if (next.top - y > threshold) go(k, regions[k].end)
    else go(k + 1, next.top)
  })

  useLayoutEffect(() => {
    settle(initial)
  }, [initial])

  useEffect(() => {
    let frame = 0
    let awakeTimer = 0
    let liftTimer = 0
    let settleTimer = 0
    let fingers = 0
    const scheduleSettle = () => {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        if (fingers > 0) return
        settleScroll(settledAt.current)
        settledAt.current = window.scrollY
      }, SETTLE_MS)
    }
    const onScroll = () => {
      scheduleSettle()
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
    const onTouch = (e: TouchEvent) => {
      touched.current = true
      fingers = e.touches.length
      if (steering.current) steering.current = { ...steering.current, until: 0 }
      settledAt.current = window.scrollY
    }
    const onTouchEnd = (e: TouchEvent) => {
      fingers = e.touches.length
      scheduleSettle()
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    const wheel = { lockUntil: 0, held: false, last: 0, push: 0 }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if ((e.target as Element | null)?.closest?.('.palette, .arcade')) return
      touched.current = true
      const now = performance.now()
      if (now - wheel.last > GESTURE_GAP_MS) {
        wheel.held = false
        wheel.push = 0
      }
      wheel.last = now
      if (now < wheel.lockUntil || wheel.held) {
        e.preventDefault()
        return
      }
      page(e, wheel)
    }
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    document.fonts?.ready.then(() => {
      if (!touched.current) settle(activeRef.current)
    })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(awakeTimer)
      window.clearTimeout(liftTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.clearTimeout(settleTimer)
      window.removeEventListener('wheel', onWheel)
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
