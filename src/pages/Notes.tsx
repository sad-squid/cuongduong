import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useReveal } from '@/crt/useReveal'

export const Notes = () => {
  useReveal()
  const { t } = useTranslation()
  return (
    <article className="page">
      <h1 className="page-title">{t('notes.title')}</h1>
      <p className="page-intro">{t('notes.body')}</p>
      <Link className="door" to="/">{t('footer.home')}</Link>
    </article>
  )
}
