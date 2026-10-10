import { createContext, useContext } from 'react'
import type { CrtController } from './CrtController'

export const CrtContext = createContext<CrtController | null>(null)

export const useCrt = () => {
  const controller = useContext(CrtContext)
  if (!controller) throw new Error('useCrt must be used inside CrtContext')
  return controller
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const loadNameFonts = () => {
  if (!document.fonts?.load) return Promise.resolve()
  return Promise.all([
    document.fonts.load('700 68px "Space Grotesk"', 'Cuong Cường 404'),
    document.fonts.load('700 68px "Name JP"', '志強コン迷子自己紹介仕事'),
  ]).then(
    () => undefined,
    () => undefined,
  )
}
