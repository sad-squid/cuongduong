import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { useDocumentTitle } from '@/crt/useDocumentTitle'
import { useReveal } from '@/crt/useReveal'

const Arcade = lazy(() => import('@/components/Arcade').then((m) => ({ default: m.Arcade })))

type Role = { label: string; value: string }

const CAST = ['chiikawa', 'hachiware', 'usagi', 'pikachu', 'handsome_squidward', 'kirby', 'pepe', 'doge', 'crewmate', 'gigachad', 'trollface', 'creeper', 'space_invader', 'nyan_cat', 'leaf']
const SPEED = 42
const RELAUNCH_MS = 2600

export const Credits = () => {
  useReveal()
  const crt = useCrt()
  const { t, i18n } = useTranslation()
  useDocumentTitle(t('credits.title'))
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(crt.reduceMotion)
  const [auto, setAuto] = useState(!crt.reduceMotion)
  const [fast, setFast] = useState(false)
  const doneRef = useRef(crt.reduceMotion)
  const autoRef = useRef(!crt.reduceMotion)
  const rateRef = useRef(1)
  const playingRef = useRef(false)
  const viewRef = useRef<HTMLElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const roles = t('credits.roles', { returnObjects: true }) as Role[]

  useEffect(() => {
    let timer = 0
    const off = crt.subscribe((event) => {
      if (event.type !== 'fireworks' || event.on || playingRef.current || crt.fireworksHeld || crt.reduceMotion) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => (playingRef.current || crt.fireworksHeld ? null : crt.launchFireworks(!doneRef.current, !doneRef.current)), RELAUNCH_MS)
    })
    crt.holdFireworks(false)
    crt.setHomeMusic(false)
    const launch = window.setTimeout(() => crt.launchFireworks(!doneRef.current, !doneRef.current), 400)
    return () => {
      off()
      window.clearTimeout(timer)
      window.clearTimeout(launch)
      crt.stopFireworks()
      crt.setHomeMusic(true)
    }
  }, [crt])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    autoRef.current = false
    setDone(true)
    crt.finaleFireworks()
  }, [crt])

  const endOf = (view: HTMLElement) => {
    const final = finalRef.current
    const footer = document.querySelector('.footer')?.getBoundingClientRect().height ?? 0
    const max = view.scrollHeight - view.clientHeight
    if (!final) return max
    return Math.min(max, final.offsetTop + final.offsetHeight / 2 - (view.clientHeight - footer) / 2)
  }

  useEffect(() => {
    const view = viewRef.current
    if (crt.reduceMotion || !view) return
    let raf = 0
    let last = performance.now()
    let pos = view.scrollTop
    let expected = view.scrollTop
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!autoRef.current) return
      const end = endOf(view)
      pos = Math.min(end, pos + SPEED * rateRef.current * dt)
      view.scrollTop = pos
      expected = view.scrollTop
      if (pos >= end) return finish()
      raf = requestAnimationFrame(tick)
    }
    const manual = () => {
      if (!autoRef.current) return
      autoRef.current = false
      cancelAnimationFrame(raf)
      setAuto(false)
    }
    const onScroll = () => {
      if (autoRef.current && Math.abs(view.scrollTop - expected) > 4) manual()
      if (!autoRef.current && view.scrollTop >= endOf(view) - 2) finish()
    }
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(e.key)) manual()
    }
    if (autoRef.current) raf = requestAnimationFrame(tick)
    view.addEventListener('scroll', onScroll, { passive: true })
    view.addEventListener('wheel', manual, { passive: true })
    view.addEventListener('touchstart', manual, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      view.removeEventListener('scroll', onScroll)
      view.removeEventListener('wheel', manual)
      view.removeEventListener('touchstart', manual)
      window.removeEventListener('keydown', onKey)
    }
  }, [crt, finish, i18n.resolvedLanguage])

  const skip = useCallback(() => {
    const view = viewRef.current
    if (!view || doneRef.current) return false
    autoRef.current = false
    view.scrollTop = endOf(view)
    finish()
    return true
  }, [finish])

  useEffect(() => {
    if (playing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || (e.key !== 'Enter' && e.key !== ' ')) return
      if ((e.target as Element | null)?.closest?.('button, input, textarea, .credits a')) return
      if (!skip()) return
      e.preventDefault()
      startRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing, skip])

  const toggleFast = () => {
    const next = !fast
    rateRef.current = next ? 2 : 1
    setFast(next)
  }

  const start = () => {
    playingRef.current = true
    skip()
    crt.stopFireworks()
    crt.setGame(true)
    setPlaying(true)
  }

  const exit = useCallback(() => {
    playingRef.current = false
    crt.setGame(false)
    setPlaying(false)
    if (!crt.fireworksHeld) crt.launchFireworks()
    window.requestAnimationFrame(() => startRef.current?.focus())
  }, [crt])

  useEffect(() => () => crt.setGame(false), [crt])

  const className = ['credits', crt.reduceMotion ? 'static' : null, done || !auto ? 'done' : null, playing ? 'hidden' : null].filter(Boolean).join(' ')

  return (
    <>
      <section
        ref={viewRef}
        className={className}
        aria-hidden={playing}
      >
        <h1 className="sr-only">{t('credits.title')}</h1>
        <div className="credits-roll">
          <p className="credits-site">{t('credits.site')}</p>
          {roles.map((role) => (
            <div key={role.label} className="credits-pair">
              <p className="credits-label">{role.label}</p>
              <p className="credits-value">{role.value}</p>
            </div>
          ))}
          <div className="credits-pair">
            <p className="credits-label">{t('credits.cast')}</p>
            <ul className="credits-cast">
              {CAST.map((name) => (
                <li key={name}>{t(`log.cast.${name}`)}</li>
              ))}
            </ul>
            <p className="credits-note">{t('credits.castNote')}</p>
          </div>
          <div ref={finalRef} className="credits-final">
            <p className="credits-thanks">{t('credits.thanks')}</p>
            <button ref={startRef} type="button" className="press-start" onClick={start}>
              {t('credits.start')}
            </button>
            <Link key={i18n.resolvedLanguage} className="door" to="/">
              {t('credits.home')}
            </Link>
          </div>
        </div>
      </section>
      {auto && !done && !playing ? (
        <button type="button" className={fast ? 'credits-speed on' : 'credits-speed'} aria-pressed={fast} onClick={toggleFast}>
          {t('credits.speed')}
        </button>
      ) : null}
      {playing ? (
        <Suspense fallback={null}>
          <Arcade onExit={exit} />
        </Suspense>
      ) : null}
    </>
  )
}
