import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_META, SUPPORTED_LANGUAGES, toLanguage, type Language } from '@/i18n'
import { useCrt } from '@/crt/context'
import { setLanguage } from '@/router'
import { LINKS } from '@/content/names'
import { IconDoor } from './Doors'
import { DotIcon } from './DotIcon'

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

  if (onCredits) {
    return crt.reduceMotion ? null : (
      <button
        type="button"
        className={running ? 'icon-door fireworks on' : 'icon-door fireworks'}
        aria-label={t('footer.fireworks')}
        aria-pressed={running}
        onClick={() => crt.toggleFireworks()}
      >
        <DotIcon icon="fireworks" />
      </button>
    )
  }

  return (
    <Link to="/credits" className="icon-door fireworks" aria-label={t('footer.fireworks')}>
      <DotIcon icon="fireworks" />
    </Link>
  )
}

const LangCycle = ({ current }: { current: Language }) => {
  const { t } = useTranslation()
  const [flash, setFlash] = useState<{ name: string; n: number } | null>(null)
  const timer = useRef(0)
  const next = SUPPORTED_LANGUAGES[(SUPPORTED_LANGUAGES.indexOf(current) + 1) % SUPPORTED_LANGUAGES.length]

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const cycle = () => {
    setFlash((was) => ({ name: LANGUAGE_META[next].name, n: (was?.n ?? 0) + 1 }))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFlash(null), 1700)
    setLanguage(next)
  }

  return (
    <span className="lang-wrap">
      <button
        type="button"
        className="icon-door lang-cycle"
        aria-label={t('footer.languageCycle', { current: LANGUAGE_META[current].name, next: LANGUAGE_META[next].name })}
        onClick={cycle}
      >
        <DotIcon icon="globe" />
      </button>
      {flash ? (
        <span key={flash.n} className="lang-flash" aria-hidden="true">
          {flash.name}
        </span>
      ) : null}
    </span>
  )
}

const SoundButton = () => {
  const crt = useCrt()
  const { t } = useTranslation()
  const [on, setOn] = useState(crt.sound.enabled)

  const toggle = () => {
    const next = !on
    crt.sound.setEnabled(next)
    if (next) crt.sound.play('toggle')
    setOn(next)
  }

  return (
    <button type="button" className={on ? 'icon-door sound on' : 'icon-door sound'} aria-label={t('footer.sound')} aria-pressed={on} onClick={toggle}>
      <DotIcon icon={on ? 'sound' : 'muted'} />
    </button>
  )
}

export const Footer = () => {
  const { t, i18n } = useTranslation()
  const lang = toLanguage(i18n.resolvedLanguage)

  return (
    <footer className="footer" data-no-blast>
      <nav className="doors links" aria-label={t('footer.elsewhere')}>
        <IconDoor icon="github" name="GitHub" href={LINKS.github} />
        <IconDoor icon="linkedin" name="LinkedIn" href={LINKS.linkedin} />
        <FireworksButton key={`fireworks-${lang}`} />
        <SoundButton />
      </nav>
      <LangCycle current={lang} />
    </footer>
  )
}
