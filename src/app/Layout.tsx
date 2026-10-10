import { useEffect, useRef, useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import { Footer } from '@/components/Footer'
import { CommandPalette } from '@/components/CommandPalette'
import { CrtController } from '@/crt/CrtController'
import { CrtContext, prefersReducedMotion } from '@/crt/context'

export const Layout = () => {
  const [crt] = useState(() => new CrtController(prefersReducedMotion()))
  const latticeRef = useRef<HTMLCanvasElement>(null)
  const transitRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [lowPower, setLowPower] = useState(false)

  useEffect(() => {
    const canvas = latticeRef.current
    const transit = transitRef.current
    if (!canvas || !transit) return
    crt.mount(canvas, transit)
    const off = crt.subscribe((event) => {
      if (event.type === 'reveal') setRevealed(event.on)
      if (event.type === 'lowPower') setLowPower(event.on)
    })
    return () => {
      off()
      crt.unmount()
    }
  }, [crt])

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
        <CommandPalette />
      </div>
    </CrtContext.Provider>
  )
}
