import { useTranslation } from 'react-i18next'
import { STACK } from '@/app/section'

export const SectionDots = ({ active, awake, onSelect }: { active: number; awake: boolean; onSelect: (index: number) => void }) => {
  const { t } = useTranslation()
  return (
    <nav className={awake ? 'section-dots awake' : 'section-dots'} aria-label={t('footer.pages')}>
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
              onClick={() => onSelect(i)}
            />
          </li>
        ))}
      </ol>
    </nav>
  )
}
