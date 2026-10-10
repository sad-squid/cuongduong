import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toLanguage } from '@/i18n'
import { Tagline } from '@/components/Tagline'
import { SignalLog } from '@/components/SignalLog'
import { useCrt, loadNameFonts } from '@/crt/context'
import { useDocumentTitle } from '@/crt/useDocumentTitle'
import { LogStore } from '@/crt/LogStore'
import { NameField } from '@/crt/NameField'
import { TaglineStore } from '@/crt/TaglineStore'
import { COLORS, contrastRatio } from '@/crt/tokens'
import { NAMES, NAME_ORDER } from '@/content/names'

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

  const request = (index: number) => {
    const name = NAMES[NAME_ORDER[index]]
    log.log(true, `request  name -> "${name.text}" (${name.lang}): ${name.note}`)
    return name.text
  }

  const regenerate = (index: number) => {
    const field = fieldRef.current
    if (!field || nameIndex.current === index) return
    nameIndex.current = index
    crt.regenerate(field, request(index))
  }

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
        if (result.carried) log.log(true, `carry    ${result.points.toLocaleString('en-US')} points from the previous heading in ${(result.ms / 1000).toFixed(2)}s`)
        else if (!crt.reduceMotion) {
          const seconds = (result.ms / 1000).toFixed(2)
          const seed = result.seed.toString(16).padStart(4, '0')
          log.log(true, `generate ${result.points.toLocaleString('en-US')} points / ${result.steps} steps / ${seconds}s / seed ${seed}`)
        }
        arriveEvent()
        if (landed.current) return
        landed.current = true
        log.log(true, `check    agent: contrast ${contrastRatio(COLORS.cream, COLORS.bg).toFixed(1)}:1 against the background, passes AAA`)
        log.log(true, 'gate     human: you. click the name to ask for another')
        log.log(false, 'note     how I ship AI content: generate, agent check, human gate')
      },
      onPerturbed: (moved, seconds) => {
        const now = performance.now()
        if (now - lastPerturb.current < 5000) return
        lastPerturb.current = now
        log.log(true, `perturb  cursor moved ${moved.toLocaleString('en-US')} points; restored in ${seconds.toFixed(1)}s`)
      },
    })
    fieldRef.current = field
    crt.setField(field)
    field.setup()
    let cancelled = false
    loadNameFonts().then(() => {
      if (cancelled) return
      field.setup()
      const name = NAMES[NAME_ORDER[nameIndex.current]]
      log.log(true, `request  name -> "${name.text}" (${name.lang}): ${name.note}`)
      crt.introduce(field, name.text, () => arriveEvent())
    })
    const off = crt.subscribe((event) => {
      if (event.type === 'activity') log.activity()
      if (event.type === 'layout') tagline.measure()
      if (event.type === 'fireworks' && event.on) log.log(true, 'launch   花火: 15s show, random cast')
      if (event.type === 'burst' && event.name) log.log(true, `burst    ${event.name}`)
      if (event.type === 'pulse') log.log(true, `pulse    click moved ${event.moved.toLocaleString('en-US')} points; interference reached ${event.words} ${event.words === 1 ? 'word' : 'words'}`)
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
    <section className="home">
      <SignalLog store={log} />
      <h1 className="name">
        <button type="button" className="name-button" data-blast onClick={() => regenerate((nameIndex.current + 1) % NAME_ORDER.length)}>
          <span className="sr-only">{t('home.heading')}</span>
          <canvas ref={canvasRef} className="name-canvas" aria-hidden="true" />
        </button>
      </h1>
      <div ref={stepRef} className="step" aria-hidden="true" data-on="false" />
      <Tagline ref={taglineRef} store={tagline} text={line} lang={lang} lit={lit} />
    </section>
  )
}

export const Home = () => {
  const crt = useCrt()
  useDocumentTitle(null)
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
