import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_META, SUPPORTED_LANGUAGES, toLanguage, type Language } from '@/i18n'
import { useCrt } from '@/crt/context'
import { setLanguage } from '@/router'
import { LINKS } from '@/content/names'
import { IconDoor } from './Doors'
import { DotIcon } from './DotIcon'
import { SquidIcon } from './SquidIcon'
import { levelToGain, readAsked, readLevels, writeAsked, writeLevels } from '@/crt/soundLevel'

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
const INVITE_DELAY_MS = 1800

const SoundControl = () => {
  const crt = useCrt()
  const { t } = useTranslation()
  const read = () => ({ on: crt.sound.enabled, sfx: crt.sound.sfx, music: crt.sound.music })
  const [state, setState] = useState(read)
  const [levels, setLevels] = useState(readLevels)
  const id = useId()
  const [pop, setPop] = useState<'open' | 'closing' | null>(null)
  const [invite, setInvite] = useState(false)
  const timer = useRef(0)
  const held = useRef(false)
  const pinned = useRef(false)
  const audible = state.on && (state.sfx || state.music)

  useEffect(
    () =>
      crt.subscribe((event) => {
        if (event.type !== 'sound') return
        setState({ on: crt.sound.enabled, sfx: crt.sound.sfx, music: crt.sound.music })
        setLevels(readLevels())
      }),
    [crt],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (readAsked()) return
    const wait = window.setTimeout(() => setInvite(true), INVITE_DELAY_MS)
    return () => window.clearTimeout(wait)
  }, [])

  const close = () => {
    window.clearTimeout(timer.current)
    if (held.current) return
    timer.current = window.setTimeout(() => {
      setPop('closing')
      pinned.current = false
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
    pinned.current = false
    setPop('closing')
    timer.current = window.setTimeout(() => setPop(null), 220)
  }

  const dismissInvite = () => {
    writeAsked()
    setInvite(false)
  }

  const answer = (music: boolean) => {
    dismissInvite()
    if (!music) return
    crt.sound.setMusic(true)
    enable(true)
    open()
  }

  // Hover or focus only peeks at the menu; a press pins it open, and a press on a pinned menu closes it.
  const toggle = () => {
    dismissInvite()
    if (pop === 'open' && pinned.current) return shut()
    pinned.current = true
    open()
  }

  const mute = () => {
    enable(!audible)
    if (!held.current) open()
  }

  // Zero switches a channel off but keeps its last level, so unmuting brings it back where it was.
  const slide = (kind: 'sfx' | 'music', value: number) => {
    if (value > 0) {
      const next = { ...levels, [kind]: value }
      setLevels(next)
      writeLevels(next)
      crt.sound.setSettings({ [kind]: levelToGain(value) })
    }
    const wasOn = crt.sound.enabled && crt.sound[kind]
    if (value > 0 && !crt.sound.enabled) {
      crt.sound.setSfx(kind === 'sfx')
      crt.sound.setMusic(kind === 'music')
      crt.sound.setEnabled(true)
    } else if (value > 0 && !wasOn) {
      if (kind === 'sfx') crt.sound.setSfx(true)
      else crt.sound.setMusic(true)
    } else if (value === 0 && wasOn) {
      if (kind === 'sfx') crt.sound.setSfx(false)
      else crt.sound.setMusic(false)
      if (!crt.sound.sfx && !crt.sound.music) crt.sound.setEnabled(false)
    }
    if (kind === 'sfx' && value > 0) crt.sound.play(wasOn ? 'tick' : 'toggle')
    if (wasOn !== value > 0) changed()
    if (!held.current) open()
  }

  const channel = (kind: 'sfx' | 'music') => {
    const shown = state.on && state[kind] ? levels[kind] : 0
    return (
      <span className="sound-row" data-off={shown === 0 || undefined}>
        <span id={`${id}-${kind}`}>{t(`footer.${kind}`)}</span>
        <span className="volume" style={{ '--fill': `${shown}%` } as CSSProperties}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={shown}
            aria-labelledby={`${id}-${kind}`}
            onChange={(e) => slide(kind, Number(e.currentTarget.value))}
          />
        </span>
      </span>
    )
  }

  return (
    <span
      className="sound-wrap"
      onPointerEnter={(e) => (!invite && (pop || e.pointerType === 'mouse') ? hold(true) : undefined)}
      onPointerLeave={() => hold(false)}
      onFocus={() => (invite ? undefined : hold(true))}
      onBlur={(e) => (e.currentTarget.contains(e.relatedTarget) ? undefined : hold(false))}
      onKeyDown={(e) => (e.key !== 'Escape' ? undefined : invite ? dismissInvite() : pop === 'open' ? shut() : undefined)}
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
      {invite && !pop ? (
        <span className="crt-pop sound-pop sound-invite" role="group" aria-label={t('footer.inviteLabel')}>
          <span className="crt-pop-label">{t('footer.invite')}</span>
          <button type="button" className="sound-option invite-yes" onClick={() => answer(true)}>
            {t('footer.inviteYes')}
          </button>
          <button type="button" className="sound-option invite-no" onClick={() => answer(false)}>
            {t('footer.inviteNo')}
          </button>
        </span>
      ) : null}
      {pop ? (
        <span className={pop === 'closing' ? 'crt-pop sound-pop closing' : 'crt-pop sound-pop'}>
          {channel('sfx')}
          {channel('music')}
          <button type="button" className="sound-option sound-mute" aria-pressed={!audible} onClick={mute}>
            {audible ? t('footer.mute') : t('footer.unmute')}
          </button>
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
