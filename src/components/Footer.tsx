import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_META, SUPPORTED_LANGUAGES, toLanguage, type Language } from '@/i18n'
import { useCrt } from '@/crt/context'
import { setLanguage } from '@/router'
import { LINKS } from '@/content/names'
import { IconDoor } from './Doors'
import { DotIcon } from './DotIcon'
import { SquidIcon } from './SquidIcon'

const FireworksButton = () => {
  const { t } = useTranslation()
  const onCredits = useRouterState({ select: (s) => s.location.pathname === '/credits' })

  return onCredits ? (
    <Link to="/" className="icon-door squid-home" aria-label={t('credits.home')}>
      <SquidIcon />
    </Link>
  ) : (
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
        <span key={flash.n} className="crt-pop lang-flash" aria-hidden="true">
          {flash.name}
        </span>
      ) : null}
    </span>
  )
}

// One tap mutes or unmutes everything, and the choice is remembered. Sound starts on the first interaction otherwise.
const SoundToggle = () => {
  const crt = useCrt()
  const { t } = useTranslation()
  const [muted, setMuted] = useState(crt.sound.muted)

  useEffect(() => crt.subscribe((event) => (event.type === 'sound' ? setMuted(crt.sound.muted) : undefined)), [crt])

  const toggle = () => {
    crt.sound.setMuted(!muted)
    if (muted) crt.sound.play('toggle')
    crt.soundChanged()
  }

  return (
    <button
      type="button"
      className={muted ? 'icon-door sound' : 'icon-door sound on'}
      aria-label={t('footer.mute')}
      aria-pressed={muted}
      onClick={toggle}
    >
      <DotIcon icon={muted ? 'muted' : 'sound'} />
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
      </nav>
      <FireworksButton key={`fireworks-${lang}`} />
      <div className="doors settings">
        <SoundToggle />
        <LangCycle current={lang} />
      </div>
    </footer>
  )
}
