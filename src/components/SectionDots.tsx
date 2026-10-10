import { useEffect, useRef, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { STACK, regionsOf, scrollProgress } from '@/app/section'
import { useCrt } from '@/crt/context'

type Variant = 'follow' | 'track' | 'near'

const VARIANTS: readonly Variant[] = ['follow', 'track', 'near']
const requested = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('dots') : null
const VARIANT: Variant = VARIANTS.find((v) => v === requested) ?? 'follow'

const PITCH = 12
const PILL = 11
const TRACK = PITCH * (STACK.length - 1) + PILL
const FIRST = 12 - PILL / 2

export const SectionDots = ({ active, awake, onSelect }: { active: number; awake: boolean; onSelect: (index: number) => void }) => {
  const { t } = useTranslation()
  const crt = useCrt()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const paint = (progress: number, page: number, view: number) => {
      const whole = Math.floor(progress)
      const frac = progress - whole
      const lead = whole * PITCH + PITCH * Math.min(1, frac * 2)
      const trail = whole * PITCH + PITCH * Math.max(0, frac * 2 - 1)
      const thumb = Math.max(PILL, view * TRACK)
      nav.style.setProperty('--marker-top', `${(FIRST + trail).toFixed(2)}px`)
      nav.style.setProperty('--marker-h', `${(PILL + lead - trail).toFixed(2)}px`)
      nav.style.setProperty('--thumb', `${thumb.toFixed(2)}px`)
      nav.style.setProperty('--thumb-top', `${(FIRST + page * (TRACK - thumb)).toFixed(2)}px`)
      nav.querySelectorAll<HTMLElement>('.section-dot').forEach((dot, i) => {
        dot.style.setProperty('--near', Math.max(0, 1 - Math.abs(progress - i)).toFixed(3))
      })
    }
    if (crt.reduceMotion) return
    let frame = 0
    const update = () => {
      frame = 0
      const sections = Array.from(document.querySelectorAll<HTMLElement>('.stack-section'))
      const regions = regionsOf(sections)
      const y = window.scrollY
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      paint(scrollProgress(regions, y), Math.min(1, y / max), window.innerHeight / document.documentElement.scrollHeight)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [crt])

  useEffect(() => {
    const nav = navRef.current
    if (!nav || !crt.reduceMotion) return
    nav.style.setProperty('--marker-top', `${FIRST + active * PITCH}px`)
    nav.style.setProperty('--marker-h', `${PILL}px`)
    nav.style.setProperty('--thumb', `${PILL}px`)
    nav.style.setProperty('--thumb-top', `${FIRST + (active / (STACK.length - 1)) * (TRACK - PILL)}px`)
    nav.querySelectorAll<HTMLElement>('.section-dot').forEach((dot, i) => dot.style.setProperty('--near', i === active ? '1' : '0'))
  }, [crt, active])

  const pick = (e: MouseEvent<HTMLButtonElement>, index: number) => {
    const list = e.currentTarget.closest('ol')
    if (e.detail === 0 || !list) return onSelect(index)
    const centers = Array.from(list.querySelectorAll('button'), (button) => {
      const r = button.getBoundingClientRect()
      return Math.abs(r.top + r.height / 2 - e.clientY)
    })
    onSelect(centers.indexOf(Math.min(...centers)))
  }

  return (
    <nav ref={navRef} className={`section-dots dots-${VARIANT}${awake ? ' awake' : ''}`} aria-label={t('footer.pages')}>
      <span className="section-now" aria-hidden="true">
        {t(`footer.${STACK[active].key}`)}
      </span>
      <ol>
        {STACK.map((section, i) => (
          <li key={section.path}>
            <button
              type="button"
              className="section-dot"
              aria-label={t(`footer.${section.key}`)}
              aria-current={i === active ? 'location' : undefined}
              onClick={(e) => pick(e, i)}
            />
          </li>
        ))}
      </ol>
      <span className="section-marker" aria-hidden="true" />
    </nav>
  )
}
