import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PointTitle } from '@/components/PointTitle'
import { useArrival } from '@/crt/useArrival'
import { usePageTitle } from '@/crt/useDocumentTitle'
import { useReveal } from '@/crt/useReveal'
import { useScrollFade } from '@/crt/useScrollFade'

type Role = { company: string; role: string; dates: string; points: string[] }

export const Work = () => {
  useReveal()
  const { t } = useTranslation()
  const roles = t('work.roles', { returnObjects: true }) as Role[]
  const { land, stage } = useArrival()
  usePageTitle('work')
  const pageRef = useRef<HTMLElement>(null)
  useScrollFade(pageRef)

  return (
    <article ref={pageRef} className="page split">
      <header className="page-aside">
        <PointTitle titleKey="work.title" onLanded={land} />
        <p className={`page-intro ${stage(0).className}`} style={stage(0).style}>
          {t('work.intro')}
        </p>
      </header>

      <ol className="page-main roles">
        {roles.map((role, i) => (
          <li key={role.company} className={`role ${stage(i + 1).className}`} style={stage(i + 1).style}>
            <div className="role-head">
              <h2 className="role-company">{role.company}</h2>
              <p className="mono-muted role-meta">{role.role}</p>
              <p className="mono-muted role-meta">{role.dates}</p>
            </div>
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
