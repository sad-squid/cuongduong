import { useTranslation } from 'react-i18next'
import { useReveal } from '@/crt/useReveal'

type Role = { company: string; role: string; dates: string; points: string[] }

export const Work = () => {
  useReveal()
  const { t } = useTranslation()
  const roles = t('work.roles', { returnObjects: true }) as Role[]

  return (
    <article className="page">
      <h1 className="page-title">{t('work.title')}</h1>
      <p className="page-intro">{t('work.intro')}</p>
      <ol className="roles">
        {roles.map((role) => (
          <li key={role.company} className="role">
            <h2 className="role-company">{role.company}</h2>
            <p className="mono-muted role-meta">
              {role.role} <span aria-hidden="true">/</span> {role.dates}
            </p>
            <ul className="plain-list">
              {role.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </article>
  )
}
