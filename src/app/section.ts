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

export type Region = { top: number; end: number }

export type Stop = { y: number; section: number }

export const PAGE_OVERLAP = 0.1

const FLAT_PX = 2

export const pageStops = (regions: Region[], vh: number, overlap = PAGE_OVERLAP): Stop[] => {
  const step = Math.max(1, vh * (1 - overlap))
  const stops: Stop[] = []
  regions.forEach((r, section) => {
    const span = r.end - r.top
    const pages = span > FLAT_PX ? Math.ceil(span / step) : 0
    for (let k = 0; k <= pages; k++) {
      const y = Math.round(pages === 0 ? r.top : r.top + (span * k) / pages)
      const prev = stops[stops.length - 1]
      if (prev && y <= prev.y + FLAT_PX) continue
      stops.push({ y, section })
    }
  })
  return stops
}

export const nearestStop = (stops: Stop[], y: number) => {
  let best = 0
  stops.forEach((s, k) => {
    if (Math.abs(s.y - y) < Math.abs(stops[best].y - y)) best = k
  })
  return best
}

export const stepStop = (stops: Stop[], y: number, dir: number) => {
  if (dir > 0) {
    const k = stops.findIndex((s) => s.y > y + 1)
    return k < 0 ? null : k
  }
  for (let k = stops.length - 1; k >= 0; k--) if (stops[k].y < y - 1) return k
  return null
}
