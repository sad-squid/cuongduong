import { createContext, useContext } from 'react'

export type SectionState = { active: boolean; armed: boolean }

export const SectionContext = createContext<SectionState>({ active: true, armed: true })

export const useSection = () => useContext(SectionContext)

export const STACK = [
  { path: '/', key: 'home' },
  { path: '/about', key: 'about' },
  { path: '/work', key: 'work' },
] as const

export const stackIndex = (path: string) => STACK.findIndex((section) => section.path === path)

export const sectionTop = (el: HTMLElement | null | undefined, index: number) => (index === 0 || !el ? 0 : el.getBoundingClientRect().top + window.scrollY)

export const regionsOf = (els: (HTMLElement | null)[]) => {
  const vh = window.innerHeight
  const max = document.documentElement.scrollHeight - vh
  const last = els.length - 1
  return els.map((el, i) => {
    const top = sectionTop(el, i)
    return { top, end: i === last ? Math.max(top, max) : Math.max(top, top + (el?.offsetHeight ?? 0) - vh) }
  })
}

export const sectionAt = (regions: { top: number }[], y: number) => {
  let index = 0
  regions.forEach((r, k) => {
    if (r.top <= y + 1) index = k
  })
  return index
}

export const scrollProgress = (regions: { top: number; end: number }[], y: number) => {
  const k = sectionAt(regions, y)
  const next = regions[k + 1]
  if (!next || y <= regions[k].end) return k
  return k + Math.min(1, Math.max(0, (y - regions[k].end) / Math.max(1, next.top - regions[k].end)))
}
