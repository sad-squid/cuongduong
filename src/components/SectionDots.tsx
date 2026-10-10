import { useEffect, useRef, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { STACK, regionsOf, scrollProgress } from '@/app/section'
import { useCrt } from '@/crt/context'

export const SectionDots = ({ active, awake, onSelect }: { active: number; awake: boolean; onSelect: (index: number) => void }) => {
  const { t } = useTranslation()
  const crt = useCrt()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const paint = (progress: number) =>
      nav.querySelectorAll<HTMLElement>('.section-dot').forEach((dot, i) => {
        dot.style.setProperty('--near', Math.max(0, 1 - Math.abs(progress - i)).toFixed(3))
      })
    if (crt.reduceMotion) return
    let frame = 0
    const update = () => {
      frame = 0
      const sections = Array.from(document.querySelectorAll<HTMLElement>('.stack-section'))
      const regions = regionsOf(sections)
      paint(scrollProgress(regions, window.scrollY))
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
    <nav ref={navRef} className={awake ? 'section-dots awake' : 'section-dots'} aria-label={t('footer.pages')}>
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
    </nav>
  )
}
