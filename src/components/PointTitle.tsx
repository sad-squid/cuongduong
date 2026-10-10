import { useEffect, useEffectEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, toLanguage } from '@/i18n'
import { useCrt, loadNameFonts } from '@/crt/context'
import { NameField, type FieldLayout } from '@/crt/NameField'

const INSET = 48

const TITLE_LAYOUT: FieldLayout = { align: 'left', inset: INSET, fontSize: (w) => (w < 560 ? 40 : 52), weight: 700 }

export const PointTitle = ({ titleKey, onLanded }: { titleKey: string; onLanded: () => void }) => {
  const crt = useCrt()
  const { t, i18n } = useTranslation()
  const lang = toLanguage(i18n.resolvedLanguage)
  const title = t(titleKey)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<NameField | null>(null)
  const shown = useRef<string | null>(null)
  const cycle = useRef(0)

  const variants = () => {
    const order = [lang, ...SUPPORTED_LANGUAGES.filter((code) => code !== lang)]
    return order.map((code) => i18n.getFixedT(code)(titleKey))
  }

  const landedEvent = useEffectEvent(() => onLanded())

  const regenerate = (text: string) => {
    const field = fieldRef.current
    if (field) crt.regenerate(field, text)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const field = new NameField(
      canvas,
      crt.reduceMotion,
      {
        onFrame: crt.frame,
        onStep: () => {},
        onSettled: () => {
          crt.liftName()
          landedEvent()
        },
        onPerturbed: () => {},
      },
      TITLE_LAYOUT,
    )
    fieldRef.current = field
    crt.setField(field)
    let cancelled = false
    loadNameFonts().then(() => {
      if (cancelled) return
      field.setup()
      shown.current = canvas.dataset.title ?? ''
      crt.introduce(field, shown.current, () => landedEvent())
    })
    return () => {
      cancelled = true
      crt.release(field)
      fieldRef.current = null
    }
  }, [crt])

  const onTitle = useEffectEvent((text: string) => {
    if (shown.current === null || shown.current === text) return
    shown.current = text
    cycle.current = 0
    regenerate(text)
  })

  useEffect(() => {
    onTitle(title)
  }, [title])

  const next = () => {
    const list = variants()
    cycle.current = (cycle.current + 1) % list.length
    shown.current = list[cycle.current]
    regenerate(list[cycle.current])
  }

  return (
    <h1 className="page-title point-title">
      <button type="button" className="title-button" data-blast onClick={next}>
        <span className="sr-only">{title}</span>
        <canvas ref={canvasRef} className="title-canvas" aria-hidden="true" data-title={title} />
      </button>
    </h1>
  )
}
