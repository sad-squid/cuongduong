import { useEffect, useRef, useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { CommandPalette } from '@/components/CommandPalette'
import { CrtController } from '@/crt/CrtController'
import { CrtContext, prefersReducedMotion } from '@/crt/context'

export const Layout = () => {
  const [crt] = useState(() => new CrtController(prefersReducedMotion()))
  const latticeRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [lowPower, setLowPower] = useState(false)
  const path = useRouterState({ select: (s) => s.location.pathname })
  const previousPath = useRef(path)

  useEffect(() => {
    const canvas = latticeRef.current
    if (!canvas) return
    crt.mount(canvas)
    const off = crt.subscribe((event) => {
      if (event.type === 'reveal') setRevealed(event.on)
      if (event.type === 'lowPower') setLowPower(event.on)
    })
    return () => {
      off()
      crt.unmount()
    }
  }, [crt])

  useEffect(() => {
    if (previousPath.current === path) return
    previousPath.current = path
    crt.tear(1.4, true)
  }, [crt, path])

  const className = ['screen', revealed ? 'revealed' : null, lowPower ? 'low-power' : null].filter(Boolean).join(' ')

  return (
    <CrtContext.Provider value={crt}>
      <div className={className}>
        <canvas ref={latticeRef} className="lattice" aria-hidden="true" />
        <div className="scan-bar" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />
        <Header />
        <main className="content">
          <Outlet />
        </main>
        <Footer />
        <div className="scanlines" aria-hidden="true" />
        <CommandPalette />
      </div>
    </CrtContext.Provider>
  )
}
