import { useEffect, useRef, useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Footer } from '@/components/Footer'
import { CommandPalette } from '@/components/CommandPalette'
import { CrtController } from '@/crt/CrtController'
import { CrtContext, prefersReducedMotion } from '@/crt/context'

export const Layout = () => {
  const [crt] = useState(() => new CrtController(prefersReducedMotion()))
  const latticeRef = useRef<HTMLCanvasElement>(null)
  const transitRef = useRef<HTMLCanvasElement>(null)
  const fireworksRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [lowPower, setLowPower] = useState(false)
  const path = useRouterState({ select: (s) => s.location.pathname })
  const [announcement, setAnnouncement] = useState('')
  const firstPath = useRef(path)

  useEffect(() => {
    const canvas = latticeRef.current
    const transit = transitRef.current
    const fireworks = fireworksRef.current
    if (!canvas || !transit || !fireworks) return
    const off = crt.subscribe((event) => {
      if (event.type === 'reveal') setRevealed(event.on)
      if (event.type === 'lowPower') setLowPower(event.on)
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

  const className = ['screen', revealed ? 'revealed' : null, lowPower ? 'low-power' : null].filter(Boolean).join(' ')

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
        <canvas ref={fireworksRef} className="transit" aria-hidden="true" />
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <CommandPalette />
      </div>
    </CrtContext.Provider>
  )
}
