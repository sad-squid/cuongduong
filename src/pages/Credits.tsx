import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { useDocumentTitle } from '@/crt/useDocumentTitle'
import { useReveal } from '@/crt/useReveal'
import { Arcade } from '@/components/Arcade'

type Role = { label: string; value: string }

const CAST = ['chiikawa', 'hachiware', 'usagi', 'pikachu', 'handsome_squidward', 'kirby', 'pepe', 'doge', 'crewmate', 'gigachad', 'trollface']
const SPEED = 42
const RELAUNCH_MS = 2600

export const Credits = () => {
  useReveal()
  const crt = useCrt()
  const { t, i18n } = useTranslation()
  useDocumentTitle(t('credits.title'))
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(crt.reduceMotion)
  const playingRef = useRef(false)
  const viewRef = useRef<HTMLElement>(null)
  const rollRef = useRef<HTMLDivElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const animRef = useRef<Animation | null>(null)
  const roles = t('credits.roles', { returnObjects: true }) as Role[]

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    let timer = 0
    const off = crt.subscribe((event) => {
      if (event.type !== 'fireworks' || event.on || playingRef.current || crt.fireworksHeld) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => (playingRef.current || crt.fireworksHeld ? null : crt.launchFireworks()), RELAUNCH_MS)
    })
    crt.holdFireworks(false)
    const launch = window.setTimeout(() => crt.launchFireworks(), 400)
    return () => {
      off()
      window.clearTimeout(timer)
      window.clearTimeout(launch)
      crt.stopFireworks()
    }
  }, [crt])

  useEffect(() => {
    const view = viewRef.current
    const roll = rollRef.current
    const final = finalRef.current
    if (crt.reduceMotion || !view || !roll || !final) return
    const run = () => {
      const previous = animRef.current
      const progress = previous?.effect?.getComputedTiming().progress ?? 0
      const finished = previous?.playState === 'finished'
      previous?.cancel()
      const height = view.clientHeight
      const footer = document.querySelector('.footer')?.getBoundingClientRect().height ?? 0
      const from = height
      const to = (height - footer) / 2 - (final.offsetTop + final.offsetHeight / 2)
      const duration = ((from - to) / SPEED) * 1000
      const anim = roll.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }], { duration, easing: 'linear', fill: 'forwards' })
      anim.onfinish = () => setDone(true)
      if (finished) anim.finish()
      else anim.currentTime = progress * duration
      animRef.current = anim
    }
    run()
    window.addEventListener('resize', run)
    return () => {
      window.removeEventListener('resize', run)
      animRef.current?.cancel()
      animRef.current = null
    }
  }, [crt, i18n.resolvedLanguage])

  const skip = useCallback(() => {
    const anim = animRef.current
    if (!anim || anim.playState === 'finished') return false
    anim.finish()
    return true
  }, [])

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

  const className = ['credits', crt.reduceMotion ? 'static' : null, done ? 'done' : null, playing ? 'hidden' : null].filter(Boolean).join(' ')

  return (
    <>
      <section
        ref={viewRef}
        className={className}
        aria-hidden={playing}
        onPointerDown={(e) => ((e.target as Element).closest('button, a') ? null : skip())}
      >
        <h1 className="sr-only">{t('credits.title')}</h1>
        <div ref={rollRef} className="credits-roll">
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
      {playing ? <Arcade onExit={exit} /> : null}
    </>
  )
}
