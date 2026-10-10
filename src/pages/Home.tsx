import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18next, { toLanguage } from '@/i18n'
import { Tagline } from '@/components/Tagline'
import { Arcade } from '@/components/Arcade'
import { SignalLog } from '@/components/SignalLog'
import { useCrt, loadNameFonts } from '@/crt/context'
import { usePageTitle } from '@/crt/useDocumentTitle'
import { LogStore } from '@/crt/LogStore'
import { NameField } from '@/crt/NameField'
import { TaglineStore } from '@/crt/TaglineStore'
import { COLORS, contrastRatio } from '@/crt/tokens'
import { NAMES, NAME_ORDER } from '@/content/names'

const say = (key: string, options: Record<string, unknown> = {}) => i18next.t(`log.${key}`, options)
const num = (value: number, digits = 0) => value.toLocaleString(i18next.resolvedLanguage, { minimumFractionDigits: digits, maximumFractionDigits: digits })

const TAP_MS = 450
const TAPS = 5

const requestName = (log: LogStore, index: number) => {
  const name = NAMES[NAME_ORDER[index]]
  log.log(true, `request  ${say('request', { text: name.text, lang: name.lang, note: say(`notes.${name.lang}`) })}`)
  return name.text
}

const HomeScreen = () => {
  const crt = useCrt()
  const { t, i18n } = useTranslation()
  const lang = toLanguage(i18n.resolvedLanguage)
  const line = t('home.line')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const fieldRef = useRef<NameField | null>(null)
  const nameIndex = useRef<number>(NAME_ORDER.indexOf(lang))
  const landed = useRef(false)
  const shownLang = useRef<string | null>(null)
  const lastPerturb = useRef(-Infinity)
  const [log] = useState(() => new LogStore(crt.reduceMotion))
  const [tagline] = useState(() => new TaglineStore(crt.reduceMotion))
  const [lit, setLit] = useState(false)
  const [streak, setStreak] = useState({ count: 0, shown: false })
  const [playing, setPlaying] = useState(false)
  const taps = useRef({ count: 0, at: -Infinity })
  const tapTimer = useRef(0)
  const nameRef = useRef<HTMLButtonElement>(null)

  const request = (index: number) => requestName(log, index)

  const regenerate = (index: number) => {
    const field = fieldRef.current
    if (!field || nameIndex.current === index) return
    nameIndex.current = index
    crt.regenerate(field, request(index))
  }

  const openGame = () => {
    crt.stopFireworks()
    crt.setGame(true)
    setPlaying(true)
  }

  const closeGame = useCallback(() => {
    crt.setGame(false)
    setPlaying(false)
    window.requestAnimationFrame(() => nameRef.current?.focus())
  }, [crt])

  const tapName = () => {
    const now = performance.now()
    const tap = taps.current
    tap.count = now - tap.at < TAP_MS ? tap.count + 1 : 1
    tap.at = now
    window.clearTimeout(tapTimer.current)
    if (tap.count === 1) {
      regenerate((nameIndex.current + 1) % NAME_ORDER.length)
      return
    }
    setStreak({ count: tap.count, shown: true })
    if (tap.count < TAPS) {
      tapTimer.current = window.setTimeout(() => setStreak((was) => ({ ...was, shown: false })), 1000)
      return
    }
    tap.count = 0
    tap.at = -Infinity
    crt.tear(1.8, true)
    tapTimer.current = window.setTimeout(() => {
      setStreak((was) => ({ ...was, shown: false }))
      openGame()
    }, 320)
  }

  useEffect(
    () => () => {
      window.clearTimeout(tapTimer.current)
      crt.setGame(false)
    },
    [crt],
  )

  const arrived = useRef(false)

  const arrive = () => {
    if (arrived.current) return
    arrived.current = true
    crt.reveal()
    setLit(true)
    tagline.sweep()
  }

  const arriveEvent = useEffectEvent(() => arrive())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const showStep = (text: string | null) => {
      const el = stepRef.current
      if (!el) return
      if (text) el.textContent = text
      el.dataset.on = text ? 'true' : 'false'
    }
    const field = new NameField(canvas, crt.reduceMotion, {
      onFrame: crt.frame,
      onStep: (step, total) => showStep(`step ${step} / ${total}`),
      onSettled: (result) => {
        showStep(null)
        crt.liftName()
        if (result.carried) log.log(true, `carry    ${say('carry', { points: num(result.points), seconds: num(result.ms / 1000, 2) })}`)
        else if (!crt.reduceMotion) {
          const seconds = num(result.ms / 1000, 2)
          const seed = result.seed.toString(16).padStart(4, '0')
          log.log(true, `generate ${say('generate', { points: num(result.points), steps: result.steps, seconds, seed })}`)
        }
        arriveEvent()
        if (landed.current) return
        landed.current = true
        log.log(true, `check    ${say('check', { ratio: num(contrastRatio(COLORS.cream, COLORS.bg), 1) })}`)
        log.log(true, `gate     ${say('gate')}`)
        log.log(false, `note     ${say('note')}`)
      },
      onPerturbed: (moved, seconds) => {
        const now = performance.now()
        if (now - lastPerturb.current < 5000) return
        lastPerturb.current = now
        log.log(true, `perturb  ${say('perturb', { moved: num(moved), seconds: num(seconds, 1) })}`)
      },
    })
    fieldRef.current = field
    crt.setField(field)
    field.setup()
    let cancelled = false
    loadNameFonts().then(() => {
      if (cancelled) return
      field.setup()
      crt.introduce(field, requestName(log, nameIndex.current), () => arriveEvent())
    })
    const off = crt.subscribe((event) => {
      if (event.type === 'activity') log.activity()
      if (event.type === 'layout') tagline.measure()
      if (event.type === 'fireworks' && event.on) log.log(true, `launch   ${say('launch')}`)
      if (event.type === 'burst' && event.name) log.log(true, `burst    ${say(`cast.${event.name.replace(/ /g, '_')}`)}`)
      if (event.type === 'pulse') log.log(true, `pulse    ${say('pulse', { moved: num(event.moved), count: event.words })}`)
    })
    return () => {
      cancelled = true
      off()
      crt.release(field)
      fieldRef.current = null
    }
  }, [crt, log, tagline])

  useEffect(() => {
    tagline.attach(taglineRef.current, () => crt.setWordTarget(tagline.hitTarget()))
    return () => {
      crt.setWordTarget(null)
      tagline.destroy()
      log.destroy()
    }
  }, [crt, tagline, log])

  useEffect(() => {
    if (crt.reduceMotion) return
    let nameTimer = 0
    let wordTimer = 0
    const nameIdle = () => {
      nameTimer = window.setTimeout(() => {
        const field = fieldRef.current
        const points = arrived.current && field && !field.isDiffusing ? field.pointsInClient() : []
        if (points.length) {
          const k = Math.floor((Math.random() * points.length) / 2) * 2
          crt.blast(points[k], points[k + 1], true)
        }
        nameIdle()
      }, 3000 + Math.random() * 2000)
    }
    const wordIdle = () => {
      wordTimer = window.setTimeout(() => {
        if (arrived.current) tagline.scrambleGroup()
        wordIdle()
      }, 7000 + Math.random() * 4000)
    }
    const reset = () => {
      window.clearTimeout(nameTimer)
      window.clearTimeout(wordTimer)
      nameIdle()
      wordIdle()
    }
    reset()
    const off = crt.subscribe((event) => {
      if (event.type === 'activity') reset()
    })
    return () => {
      off()
      window.clearTimeout(nameTimer)
      window.clearTimeout(wordTimer)
    }
  }, [crt, tagline])

  const onLanguage = useEffectEvent((index: number) => regenerate(index))

  useEffect(() => {
    const previous = shownLang.current
    shownLang.current = lang
    tagline.setText(lang, line)
    if (previous === null) return
    if (arrived.current) tagline.sweep()
    onLanguage(NAME_ORDER.indexOf(lang))
  }, [lang, line, tagline])

  return (
    <>
      <section className={playing ? 'home hidden' : 'home'} aria-hidden={playing}>
        <SignalLog store={log} />
        <h1 className="name">
          <button ref={nameRef} type="button" className="name-button" data-blast onClick={tapName}>
            <span className="sr-only">{t('home.heading')}</span>
            <canvas ref={canvasRef} className="name-canvas" aria-hidden="true" />
            <span className={streak.shown ? 'tap-count on' : 'tap-count'} aria-hidden="true">
              {Array.from({ length: TAPS }, (_, i) => (
                <i key={i} className={i < streak.count ? (i === streak.count - 1 ? 'lit new' : 'lit') : undefined} />
              ))}
            </span>
          </button>
        </h1>
        <div ref={stepRef} className="step" aria-hidden="true" data-on="false" />
        <Tagline ref={taglineRef} store={tagline} text={line} lang={lang} lit={lit} />
      </section>
      {playing ? <Arcade onExit={closeGame} /> : null}
    </>
  )
}

export const Home = () => {
  const crt = useCrt()
  usePageTitle('home')
  const [run, setRun] = useState(0)

  useEffect(
    () =>
      crt.subscribe((event) => {
        if (event.type === 'replay') setRun((n) => n + 1)
      }),
    [crt],
  )

  return <HomeScreen key={run} />
}
