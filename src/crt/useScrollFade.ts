import { useEffect, type RefObject } from 'react'

const TOP_BAND = 0.3
const BOTTOM_BAND = 0.18
const FOOTER_SPACE = 110

export const useScrollFade = (root: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const container = root.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const wide = window.matchMedia('(min-width: 1080px)')
    let frame = 0

    const targets = () =>
      Array.from(container.querySelectorAll<HTMLElement>(wide.matches ? '.page-main .stage' : '.stage'))

    const clear = (el: HTMLElement) => {
      el.style.filter = ''
      el.style.translate = ''
    }

    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const top = vh * TOP_BAND
      const bottomStart = vh - FOOTER_SPACE - vh * BOTTOM_BAND
      const bottomEnd = vh - FOOTER_SPACE
      container.querySelectorAll<HTMLElement>('.page-aside .stage').forEach((el) => {
        if (wide.matches) clear(el)
      })
      for (const el of targets()) {
        const r = el.getBoundingClientRect()
        const center = r.top + Math.min(r.height, vh * 0.5) / 2
        let visible = 1
        let shift = 0
        if (center < top) {
          visible = Math.max(0, center / top)
          shift = -(1 - visible) * 14
        } else if (center > bottomStart) {
          visible = Math.max(0, Math.min(1, (bottomEnd - center) / (bottomEnd - bottomStart)))
          shift = (1 - visible) * 18
        }
        if (visible >= 0.999) {
          clear(el)
          continue
        }
        el.style.filter = `opacity(${visible.toFixed(3)}) blur(${((1 - visible) * 3).toFixed(2)}px)`
        el.style.translate = `0 ${shift.toFixed(1)}px`
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    wide.addEventListener('change', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      wide.removeEventListener('change', schedule)
    }
  }, [root])
}
