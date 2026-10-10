import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
        <span key={flash.n} className="crt-pop lang-flash" aria-hidden="true">
          {flash.name}
        </span>
      ) : null}
    </span>
  )
}

const LEVEL_KEY = 'cd-sound-level'
const MAX_VOLUME = 0.6
const POP_MS = 2400

const readLevel = () => {
  try {
    const stored = Number(window.localStorage.getItem(LEVEL_KEY))
    return Number.isFinite(stored) && stored > 0 && stored <= 100 ? stored : 50
  } catch {
    return 50
  }
}

const SoundControl = () => {
  const crt = useCrt()
  const { t } = useTranslation()
  const [on, setOn] = useState(crt.sound.enabled)
  const [level, setLevel] = useState(readLevel)
  const [pop, setPop] = useState<'open' | 'closing' | null>(null)
  const timer = useRef(0)
  const held = useRef(false)

  useEffect(() => {
    crt.sound.setSettings({ volume: (level / 100) * MAX_VOLUME })
  }, [crt, level])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const close = () => {
    window.clearTimeout(timer.current)
    if (held.current) return
    timer.current = window.setTimeout(() => {
      setPop('closing')
      timer.current = window.setTimeout(() => setPop(null), 220)
    }, POP_MS)
  }

  const open = () => {
    setPop('open')
    close()
  }

  const hold = (on: boolean) => {
    held.current = on
    if (on) {
      window.clearTimeout(timer.current)
      setPop('open')
    } else close()
  }

  const enable = (next: boolean) => {
    crt.sound.setEnabled(next)
    if (next) crt.sound.play('toggle')
    setOn(next)
  }

  const toggle = () => {
    enable(!on)
    open()
  }

  const slide = (value: number) => {
    setLevel(value)
    try {
      window.localStorage.setItem(LEVEL_KEY, String(value))
    } catch {
      return
    }
    if (value === 0 && on) enable(false)
    else if (value > 0 && !on) enable(true)
    else if (value > 0) crt.sound.play('tick')
  }

  const shown = on ? level : 0

  return (
    <span
      className="sound-wrap"
      onPointerEnter={() => (pop ? hold(true) : undefined)}
      onPointerLeave={() => hold(false)}
      onFocus={() => (pop ? hold(true) : undefined)}
      onBlur={(e) => (e.currentTarget.contains(e.relatedTarget) ? undefined : hold(false))}
    >
      <button type="button" className={on ? 'icon-door sound on' : 'icon-door sound'} aria-label={t('footer.sound')} aria-pressed={on} onClick={toggle}>
        <DotIcon icon={on ? 'sound' : 'muted'} />
      </button>
      {pop ? (
        <span className={pop === 'closing' ? 'crt-pop sound-pop closing' : 'crt-pop sound-pop'}>
          <span className="crt-pop-label" aria-hidden="true">
            {on ? t('footer.soundOn') : t('footer.soundOff')}
          </span>
          <span className="volume" style={{ '--fill': `${shown}%` } as CSSProperties}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={shown}
              aria-label={t('footer.volume')}
              onChange={(e) => slide(Number(e.currentTarget.value))}
            />
          </span>
        </span>
      ) : null}
    </span>
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
        <SoundControl />
        <LangCycle current={lang} />
      </div>
    </footer>
  )
}
