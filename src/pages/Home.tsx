import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tagline } from '@/components/Tagline'
import { SignalLog } from '@/components/SignalLog'
import { useCrt, loadNameFonts } from '@/crt/context'
import { LogStore } from '@/crt/LogStore'
import { NameField } from '@/crt/NameField'
import { TaglineStore } from '@/crt/TaglineStore'
import { COLORS, contrastRatio } from '@/crt/tokens'
import { NAMES, NAME_ORDER, toSiteLang } from '@/content/names'

const HomeScreen = () => {
  const crt = useCrt()
  const { t, i18n } = useTranslation()
  const lang = toSiteLang(i18n.resolvedLanguage)
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
    if (!field || !landed.current || field.isDiffusing) return
    nameIndex.current = index
    crt.ejectFromName()
    field.generate(request(index), false, null)
    crt.tear(1.6, true)
  }

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
        if (landed.current) return
        landed.current = true
        crt.reveal()
        setLit(true)
        tagline.sweep()
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
      crt.introduce(field, name.text)
    })
    const off = crt.subscribe((event) => {
      if (event.type === 'activity') log.activity()
      if (event.type === 'layout') tagline.measure()
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

  const onLanguage = useEffectEvent((index: number) => regenerate(index))

  useEffect(() => {
    const previous = shownLang.current
    shownLang.current = lang
    tagline.setText(lang, line)
    if (previous === null) return
    if (landed.current) tagline.sweep()
    onLanguage(NAME_ORDER.indexOf(lang))
  }, [lang, line, tagline])

  return (
    <section className="home">
      <SignalLog store={log} />
      <h1 className="name">
        <button type="button" className="name-button" data-blast onClick={() => regenerate((nameIndex.current + 1) % NAME_ORDER.length)}>
          <span className="sr-only">Cuong Duong</span>
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
