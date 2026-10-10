import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_META, SUPPORTED_LANGUAGES, toLanguage, type Language } from '@/i18n'
import { useCrt } from '@/crt/context'
import { setLanguage } from '@/router'
import { LINKS } from '@/content/names'
import { IconDoor, RouteDoor } from './Doors'
import { DotIcon } from './DotIcon'
import { useScramble } from './useScramble'

const LangButton = ({ code, current }: { code: Language; current: boolean }) => {
  const crt = useCrt()
  const label = LANGUAGE_META[code].label
  const [text, trigger] = useScramble(label, crt.reduceMotion)
  return (
    <button
      type="button"
      lang={code}
      className={current ? 'on' : undefined}
      aria-label={label}
      aria-pressed={current}
      onPointerEnter={trigger}
      onFocus={trigger}
      onClick={() => setLanguage(code)}
    >
      <span className="label-long">{text}</span>
      <span className="label-short" aria-hidden="true">
        {LANGUAGE_META[code].code}
      </span>
    </button>
  )
}

const FireworksButton = () => {
  const crt = useCrt()
  const { t } = useTranslation()
  const [running, setRunning] = useState(false)

  useEffect(
    () =>
      crt.subscribe((event) => {
        if (event.type === 'fireworks') setRunning(event.on)
      }),
    [crt],
  )

  return crt.reduceMotion ? null : (
    <button
      type="button"
      className={running ? 'icon-door fireworks on' : 'icon-door fireworks'}
      aria-label={t('footer.fireworks')}
      aria-pressed={running}
      onClick={() => crt.launchFireworks()}
    >
      <DotIcon icon="fireworks" />
    </button>
  )
}

export const Footer = () => {
  const { t, i18n } = useTranslation()
  const lang = toLanguage(i18n.resolvedLanguage)

  return (
    <footer className="footer">
      <nav className="doors" aria-label={t('footer.pages')}>
        <RouteDoor key={`home-${lang}`} label={t('footer.home')} to="/" />
        <RouteDoor key={`about-${lang}`} label={t('footer.about')} to="/about" />
        <RouteDoor key={`work-${lang}`} label={t('footer.work')} to="/work" />
      </nav>
      <nav className="doors" aria-label={t('footer.elsewhere')}>
        <IconDoor icon="github" name="GitHub" href={LINKS.github} />
        <IconDoor icon="linkedin" name="LinkedIn" href={LINKS.linkedin} />
        <FireworksButton />
      </nav>
      <div className="langs" role="group" aria-label={t('footer.language')}>
        {SUPPORTED_LANGUAGES.map((code) => (
          <LangButton key={code} code={code} current={code === lang} />
        ))}
      </div>
    </footer>
  )
}
