import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_META, SUPPORTED_LANGUAGES, toLanguage, type Language } from '@/i18n'
import { useCrt } from '@/crt/context'
import { setLanguage } from '@/router'
import { LINKS } from '@/content/names'
import { IconDoor } from './Doors'
import { DotIcon } from './DotIcon'
import { SquidIcon } from './SquidIcon'
import { levelToVolume, readLevel, writeLevel } from '@/crt/soundLevel'

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

const POP_MS = 2400
const JUST_OPENED_MS = 250

const SoundControl = () => {
  const crt = useCrt()
  const { t } = useTranslation()
  const read = () => ({ on: crt.sound.enabled, sfx: crt.sound.sfx, music: crt.sound.music })
  const [state, setState] = useState(read)
  const [level, setLevel] = useState(readLevel)
  const [pop, setPop] = useState<'open' | 'closing' | null>(null)
  const timer = useRef(0)
  const held = useRef(false)
  const fresh = useRef(false)
  const freshTimer = useRef(0)
  const audible = state.on && (state.sfx || state.music)

  useEffect(() => {
    crt.sound.setSettings({ volume: levelToVolume(level) })
  }, [crt, level])

  useEffect(
    () =>
      crt.subscribe((event) => {
        if (event.type !== 'sound') return
        setState({ on: crt.sound.enabled, sfx: crt.sound.sfx, music: crt.sound.music })
        setLevel(readLevel())
      }),
    [crt],
  )

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(freshTimer.current)
    },
    [],
  )

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
      if (pop !== 'open') {
        fresh.current = true
        window.clearTimeout(freshTimer.current)
        freshTimer.current = window.setTimeout(() => {
          fresh.current = false
        }, JUST_OPENED_MS)
      }
      setPop('open')
    } else close()
  }

  const changed = () => {
    setState(read())
    crt.soundChanged()
  }

  const enable = (next: boolean) => {
    if (next && !crt.sound.sfx && !crt.sound.music) {
      crt.sound.setSfx(true)
      crt.sound.setMusic(true)
    }
    crt.sound.setEnabled(next)
    if (next) crt.sound.play('toggle')
    changed()
  }

  const shut = () => {
    window.clearTimeout(timer.current)
    held.current = false
    setPop('closing')
    timer.current = window.setTimeout(() => setPop(null), 220)
  }

  const toggle = () => (pop === 'open' && !fresh.current ? shut() : open())

  const pick = (kind: 'sfx' | 'music') => {
    if (!crt.sound.enabled) {
      crt.sound.setSfx(kind === 'sfx')
      crt.sound.setMusic(kind === 'music')
      crt.sound.setEnabled(true)
    } else if (kind === 'sfx') crt.sound.setSfx(!crt.sound.sfx)
    else crt.sound.setMusic(!crt.sound.music)
    if (!crt.sound.sfx && !crt.sound.music) crt.sound.setEnabled(false)
    if (kind === 'sfx' && crt.sound.sfx) crt.sound.play('toggle')
    changed()
    if (!held.current) open()
  }

  const slide = (value: number) => {
    setLevel(value)
    writeLevel(value)
    if (value === 0 && audible) enable(false)
    else if (value > 0 && !audible) enable(true)
    else if (value > 0) crt.sound.play('tick')
  }

  const shown = audible ? level : 0
  const option = (kind: 'sfx' | 'music') => {
    const on = state.on && state[kind]
    return (
      <button type="button" className="sound-option" aria-pressed={on} onClick={() => pick(kind)}>
        <span>{t(`footer.${kind}`)}</span>
        <b aria-hidden="true">{on ? t('footer.on') : t('footer.off')}</b>
      </button>
    )
  }

  return (
    <span
      className="sound-wrap"
      onPointerEnter={(e) => (pop || e.pointerType === 'mouse' ? hold(true) : undefined)}
      onPointerLeave={() => hold(false)}
      onFocus={() => hold(true)}
      onBlur={(e) => (e.currentTarget.contains(e.relatedTarget) ? undefined : hold(false))}
      onKeyDown={(e) => (e.key === 'Escape' && pop === 'open' ? shut() : undefined)}
    >
      <button
        type="button"
        className={audible ? 'icon-door sound on' : 'icon-door sound'}
        aria-label={t('footer.sound')}
        aria-expanded={pop === 'open'}
        onClick={toggle}
        onContextMenu={(e) => {
          e.preventDefault()
          open()
        }}
      >
        <DotIcon icon={audible ? 'sound' : 'muted'} />
      </button>
      {pop ? (
        <span className={pop === 'closing' ? 'crt-pop sound-pop closing' : 'crt-pop sound-pop'}>
          <span className="crt-pop-label" aria-hidden="true">
            {audible ? t('footer.soundOn') : t('footer.soundOff')}
          </span>
          {option('sfx')}
          {option('music')}
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
