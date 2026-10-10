import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCrt, loadNameFonts } from '@/crt/context'
import { NameField } from '@/crt/NameField'
import { useDocumentTitle } from '@/crt/useDocumentTitle'

const SIGNALS = ['404', '迷子']

export const NotFound = () => {
  const crt = useCrt()
  const { t } = useTranslation()
  useDocumentTitle(t('notFound.title'))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<NameField | null>(null)
  const index = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    crt.reveal()
    crt.setSnow(true)
    const field = new NameField(canvas, crt.reduceMotion, {
      onFrame: crt.frame,
      onStep: () => {},
      onSettled: () => crt.liftName(),
      onPerturbed: () => {},
    })
    fieldRef.current = field
    crt.setField(field)
    let cancelled = false
    loadNameFonts().then(() => {
      if (cancelled) return
      field.setup()
      crt.introduce(field, SIGNALS[0])
    })
    return () => {
      cancelled = true
      crt.setSnow(false)
      crt.release(field)
      fieldRef.current = null
    }
  }, [crt])

  const cycle = () => {
    const field = fieldRef.current
    if (!field) return
    index.current = (index.current + 1) % SIGNALS.length
    crt.regenerate(field, SIGNALS[index.current])
  }

  return (
    <section className="home no-signal">
      <p className="mono-muted signal-label">{t('notFound.signal')}</p>
      <h1 className="name">
        <button type="button" className="name-button" data-blast onClick={cycle}>
          <span className="sr-only">{t('notFound.title')}</span>
          <canvas ref={canvasRef} className="name-canvas" aria-hidden="true" />
        </button>
      </h1>
      <p className="tagline lit">{t('notFound.body')}</p>
      <Link className="door" to="/">{t('notFound.home')}</Link>
    </section>
  )
}
