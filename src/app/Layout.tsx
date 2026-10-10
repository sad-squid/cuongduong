import { useEffect, useRef, useState } from 'react'
import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { Footer } from '@/components/Footer'
import { CommandPalette } from '@/components/CommandPalette'
import { CrtController } from '@/crt/CrtController'
import { CrtContext, prefersReducedMotion } from '@/crt/context'

const SWIPE_ORDER = ['/', '/about', '/work'] as const

export const Layout = () => {
  const [crt] = useState(() => new CrtController(prefersReducedMotion()))
  const latticeRef = useRef<HTMLCanvasElement>(null)
  const transitRef = useRef<HTMLCanvasElement>(null)
  const fireworksRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [lowPower, setLowPower] = useState(false)
  const [playing, setPlaying] = useState(false)
  const path = useRouterState({ select: (s) => s.location.pathname })
  const [announcement, setAnnouncement] = useState('')
  const firstPath = useRef(path)
  const router = useRouter()

  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null
    const down = (e: TouchEvent) => {
      const touch = e.touches[0]
      start = e.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY, t: performance.now() } : null
    }
    const up = (e: TouchEvent) => {
      const from = start
      start = null
      const touch = e.changedTouches[0]
      if (!from || !touch) return
      const dx = touch.clientX - from.x
      const dy = touch.clientY - from.y
      if (performance.now() - from.t > 700 || Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.6) return
      if ((e.target as Element | null)?.closest?.('.palette, input, textarea')) return
      const index = SWIPE_ORDER.indexOf(router.state.location.pathname as (typeof SWIPE_ORDER)[number])
      const next = index < 0 ? undefined : SWIPE_ORDER[index + (dx < 0 ? 1 : -1)]
      if (next) router.navigate({ to: next })
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up, { passive: true })
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchend', up)
    }
  }, [router])

  useEffect(() => {
    const canvas = latticeRef.current
    const transit = transitRef.current
    const fireworks = fireworksRef.current
    if (!canvas || !transit || !fireworks) return
    const off = crt.subscribe((event) => {
      if (event.type === 'reveal') setRevealed(event.on)
      if (event.type === 'lowPower') setLowPower(event.on)
      if (event.type === 'game') setPlaying(event.on)
    })
    crt.mount(canvas, transit, fireworks)
    return () => {
      off()
      crt.unmount()
    }
  }, [crt])

  useEffect(() => {
    if (firstPath.current === path) return
    firstPath.current = path
    const timer = window.setTimeout(() => setAnnouncement(document.title), 80)
    return () => window.clearTimeout(timer)
  }, [path])

  const className = ['screen', revealed ? 'revealed' : null, lowPower ? 'low-power' : null, path === '/credits' ? 'on-credits' : null, playing ? 'playing' : null]
    .filter(Boolean)
    .join(' ')

  return (
    <CrtContext.Provider value={crt}>
      <div className={className}>
        <canvas ref={latticeRef} className="lattice" aria-hidden="true" />
        <div className="scan-bar" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />
        <main className="content">
          <Outlet />
        </main>
        <Footer />
        <div className="scanlines" aria-hidden="true" />
        <canvas ref={transitRef} className="transit" aria-hidden="true" />
        <canvas ref={fireworksRef} className="transit fireworks-layer" aria-hidden="true" />
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <CommandPalette />
      </div>
    </CrtContext.Provider>
  )
}
