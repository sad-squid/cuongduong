import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
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
  const [running, setRunning] = useState(() => crt.fireworksRunning)
  const onCredits = useRouterState({ select: (s) => s.location.pathname === '/credits' })

  useEffect(
    () =>
      crt.subscribe((event) => {
        if (event.type === 'fireworks') setRunning(event.on)
      }),
    [crt],
  )

  return (
    <Link
      to="/credits"
      className={running ? 'icon-door fireworks on' : 'icon-door fireworks'}
      aria-label={t('footer.fireworks')}
      onClick={() => (onCredits ? crt.launchFireworks() : null)}
    >
      <DotIcon icon="fireworks" />
    </Link>
  )
}

const PAGES = [
  ['/', 'footer.home'],
  ['/about', 'footer.about'],
  ['/work', 'footer.work'],
] as const

export const Footer = () => {
  const { t, i18n } = useTranslation()
  const lang = toLanguage(i18n.resolvedLanguage)

  return (
    <footer className="footer">
      <nav className="page-dots" aria-label={t('footer.pages')}>
        {PAGES.map(([to, key]) => (
          <Link key={`${to}-${lang}`} className="page-dot" to={to} aria-label={t(key)} title={t(key)} activeOptions={{ exact: true }} />
        ))}
      </nav>
      <nav className="doors pages" aria-label={t('footer.pages')}>
        <RouteDoor key={`home-${lang}`} label={t('footer.home')} to="/" />
        <RouteDoor key={`about-${lang}`} label={t('footer.about')} to="/about" />
        <RouteDoor key={`work-${lang}`} label={t('footer.work')} to="/work" />
      </nav>
      <nav className="doors links" aria-label={t('footer.elsewhere')}>
        <IconDoor icon="github" name="GitHub" href={LINKS.github} />
        <IconDoor icon="linkedin" name="LinkedIn" href={LINKS.linkedin} />
        <FireworksButton key={`fireworks-${lang}`} />
      </nav>
      <div className="langs" role="group" aria-label={t('footer.language')}>
        {SUPPORTED_LANGUAGES.map((code) => (
          <LangButton key={code} code={code} current={code === lang} />
        ))}
      </div>
    </footer>
  )
}
