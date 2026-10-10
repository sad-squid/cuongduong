import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PointTitle } from '@/components/PointTitle'
import { useArrival } from '@/crt/useArrival'
import { useReveal } from '@/crt/useReveal'
import { useScrollFade } from '@/crt/useScrollFade'

type NameRow = { lang: string; label: string; value: string; say: string }
type LanguageRow = { name: string; level: string }

export const About = () => {
  useReveal()
  const { t } = useTranslation()
  const names = t('about.names', { returnObjects: true }) as NameRow[]
  const story = t('about.story', { returnObjects: true }) as string[]
  const languages = t('about.languages', { returnObjects: true }) as LanguageRow[]
  const recognition = t('about.recognition', { returnObjects: true }) as string[]
  const { land, stage } = useArrival()
  const pageRef = useRef<HTMLElement>(null)
  useScrollFade(pageRef)

  return (
    <article ref={pageRef} className="page split">
      <header className="page-aside">
        <PointTitle titleKey="about.title" onLanded={land} />
        <section aria-labelledby="about-name" {...stage(0)}>
          <h2 id="about-name" className="section-label">{t('about.nameHeading')}</h2>
          <dl className="names">
            {names.map((row) => (
              <div key={row.lang} className="name-row">
                <dt className="mono-muted">{row.label}</dt>
                <dd>
                  <span lang={row.lang} className="name-value">{row.value}</span>
                  {row.say ? <span className="name-say">{row.say}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </header>

      <div className="page-main">
        <section className="prose">
          {story.map((paragraph, i) => (
            <p key={paragraph} {...stage(i + 1)}>
              {paragraph}
            </p>
          ))}
        </section>

        <div className={`facts ${stage(story.length + 1).className}`} style={stage(story.length + 1).style}>
          <section aria-labelledby="about-languages">
            <h2 id="about-languages" className="section-label">{t('about.languagesHeading')}</h2>
            <dl className="pairs">
              {languages.map((row) => (
                <div key={row.name}>
                  <dt>{row.name}</dt>
                  <dd className="mono-muted">{row.level}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="about-recognition">
            <h2 id="about-recognition" className="section-label">{t('about.recognitionHeading')}</h2>
            <ul className="plain-list">
              {recognition.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </article>
  )
}
