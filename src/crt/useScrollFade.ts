import { useEffect, type RefObject } from 'react'

const TOP_BAND = 0.3
const BOTTOM_BAND = 0.18
const FOOTER_SPACE = 110
const COMPACT_BOTTOM_BAND = 0.08
const COMPACT_FOOTER_SPACE = 64

export const useScrollFade = (root: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const container = root.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const wide = window.matchMedia('(min-width: 1080px)')
    const compact = window.matchMedia('(max-width: 720px)')
    let frame = 0
    let targets: HTMLElement[] = []
    let pinned: HTMLElement[] = []

    const collect = () => {
      targets = Array.from(container.querySelectorAll<HTMLElement>(wide.matches ? '.page-main .stage' : '.stage'))
      pinned = wide.matches ? Array.from(container.querySelectorAll<HTMLElement>('.page-aside .stage')) : []
      pinned.forEach((el) => clear(el))
    }

    const clear = (el: HTMLElement) => {
      el.style.filter = ''
      el.style.translate = ''
    }

    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const top = vh * TOP_BAND
      const footer = compact.matches ? COMPACT_FOOTER_SPACE : FOOTER_SPACE
      const bottomStart = vh - footer - vh * (compact.matches ? COMPACT_BOTTOM_BAND : BOTTOM_BAND)
      const bottomEnd = vh - footer
      const blur = compact.matches ? 1.5 : 3
      const scrolled = window.scrollY
      const remaining = Math.max(0, document.documentElement.scrollHeight - vh - scrolled)
      const topStrength = Math.min(1, scrolled / top)
      const bottomStrength = Math.min(1, remaining / (bottomEnd - bottomStart))
      const rects = targets.map((el) => el.getBoundingClientRect())
      targets.forEach((el, i) => {
        const r = rects[i]
        const center = r.top + Math.min(r.height, vh * 0.5) / 2
        let visible = 1
        let shift = 0
        if (center < top) {
          visible = 1 - (1 - Math.max(0, center / top)) * topStrength
          shift = -(1 - visible) * 14
        } else if (center > bottomStart) {
          visible = 1 - (1 - Math.max(0, Math.min(1, (bottomEnd - center) / (bottomEnd - bottomStart)))) * bottomStrength
          shift = (1 - visible) * 18
        }
        if (visible >= 0.999) {
          clear(el)
          return
        }
        el.style.filter = `opacity(${visible.toFixed(3)}) blur(${((1 - visible) * blur).toFixed(2)}px)`
        el.style.translate = `0 ${shift.toFixed(1)}px`
      })
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    const rewire = () => {
      collect()
      schedule()
    }

    rewire()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    wide.addEventListener('change', rewire)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      wide.removeEventListener('change', rewire)
    }
  }, [root])
}
