import { useEffect, useState, type CSSProperties } from 'react'
import { useSection } from '@/app/section'

const FALLBACK_MS = 2200

export const useArrival = () => {
  const [ready, setReady] = useState(false)
  const { armed } = useSection()

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setReady(true), FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [armed])

  const stage = (index: number) => ({
    className: ready ? 'stage ready' : 'stage',
    style: { '--i': index } as CSSProperties,
  })

  return { land: () => setReady(true), stage }
}
