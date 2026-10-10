import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Home } from '@/pages/Home'
import { About } from '@/pages/About'
import { Work } from '@/pages/Work'
import { SectionDots } from '@/components/SectionDots'
import { ScrollHint } from '@/components/ScrollHint'
import { useCrt } from '@/crt/context'
import { STACK, SectionContext, stackIndex } from './section'

const PAGES = [Home, About, Work]
const ARM_LINE = 0.92
const ACTIVE_LINE = 0.4
const STEER_MS = 1400
const SYNC_MS = 1500
const AWAKE_MS = 1400
const LIFT_MS = 160

const sectionTop = (el: HTMLElement | null | undefined, index: number) => (index === 0 || !el ? 0 : el.getBoundingClientRect().top + window.scrollY)

export const MobileStack = () => {
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

  const states = useMemo(() => STACK.map((_, i) => ({ active: i === active, armed: armed[i] })), [active, armed])

  const scrollToSection = (index: number, smooth: boolean) => {
    steering.current = { index, until: performance.now() + STEER_MS }
    window.scrollTo({ top: sectionTop(sectionRefs.current[index], index), behavior: smooth && !crt.reduceMotion ? 'smooth' : 'instant' })
  }

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

  useLayoutEffect(() => {
    settle(initial)
  }, [initial])

  useEffect(() => {
    let frame = 0
    let awakeTimer = 0
    let liftTimer = 0
    const onScroll = () => {
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
    const onTouch = () => {
      touched.current = true
      if (steering.current) steering.current = { ...steering.current, until: 0 }
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('wheel', onTouch, { passive: true })
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
      window.removeEventListener('wheel', onTouch)
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
          className={`stack-section stack-${STACK[i].key}`}
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
