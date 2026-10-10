import { createContext, useContext, useSyncExternalStore } from 'react'

export type SectionState = { active: boolean; armed: boolean }

export const SectionContext = createContext<SectionState>({ active: true, armed: true })

export const useSection = () => useContext(SectionContext)

const COMPACT = '(max-width: 720px)'

const subscribeCompact = (onChange: () => void) => {
  const query = window.matchMedia(COMPACT)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export const useCompact = () => useSyncExternalStore(subscribeCompact, () => window.matchMedia(COMPACT).matches)

export const STACK = [
  { path: '/', key: 'home' },
  { path: '/about', key: 'about' },
  { path: '/work', key: 'work' },
] as const

export const stackIndex = (path: string) => STACK.findIndex((section) => section.path === path)
