import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { Invaders, type InputKind, type InvadersHud } from '@/crt/Invaders'

const initialInput = (): InputKind => (window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse')

export const Arcade = ({ onExit }: { onExit: () => void }) => {
  const crt = useCrt()
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Invaders | null>(null)
  const [hud, setHud] = useState<InvadersHud>({ score: 0, wave: 1, lives: 3 })
  const [over, setOver] = useState(false)
  const [hint, setHint] = useState(true)
  const [input, setInput] = useState(initialInput)
  const [hintY, setHintY] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Invaders(canvas, {
      onHud: setHud,
      onOver: () => setOver(true),
      onHit: (x, y) => crt.ripple(x, y),
      onInput: setInput,
      onShot: () => setHint(false),
      onLayout: setHintY,
    }, initialInput())
    gameRef.current = game
    game.start()
    rootRef.current?.focus()
    const timer = window.setTimeout(() => setHint(false), 3000)
    return () => {
      window.clearTimeout(timer)
      game.destroy()
      gameRef.current = null
    }
  }, [crt])

  const restart = () => {
    setOver(false)
    gameRef.current?.start()
    rootRef.current?.focus()
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const stop = (e: TouchEvent) => e.stopPropagation()
    const hold = (e: TouchEvent) => {
      e.stopPropagation()
      if (e.cancelable) e.preventDefault()
    }
    root.addEventListener('touchstart', stop, { passive: true })
    root.addEventListener('touchend', stop, { passive: true })
    root.addEventListener('touchmove', hold, { passive: false })
    return () => {
      root.removeEventListener('touchstart', stop)
      root.removeEventListener('touchend', stop)
      root.removeEventListener('touchmove', hold)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented && e.key === 'Escape') return
      if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
        return
      }
      if (!over || (e.key !== 'Enter' && e.key !== ' ')) return
      if ((e.target as Element | null)?.closest?.('button')) return
      e.preventDefault()
      setOver(false)
      gameRef.current?.start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [over, onExit])

  return (
    <div ref={rootRef} className="arcade" data-no-blast role="region" aria-label={t('arcade.label')} tabIndex={-1}>
      <canvas ref={canvasRef} className="arcade-canvas" aria-hidden="true" />
      <div className="arcade-hud">
        <span>
          {t('arcade.score')} <b>{String(hud.score).padStart(5, '0')}</b>
        </span>
        <span>
          {t('arcade.wave')} <b>{hud.wave}</b>
        </span>
        <span className="arcade-lives" role="img" aria-label={t('arcade.lives', { count: hud.lives })}>
          {Array.from({ length: 3 }, (_, i) => (
            <i key={i} className={i < hud.lives ? 'on' : undefined} />
          ))}
        </span>
        <button type="button" className="arcade-close" aria-label={t('arcade.close')} onClick={onExit}>
          esc ×
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {over ? `${t('arcade.over')} ${hud.score}` : ''}
      </p>
      {over ? (
        <div className="arcade-over">
          <p className="arcade-over-title">{t('arcade.over')}</p>
          <p className="arcade-over-score">
            {t('arcade.score')} {String(hud.score).padStart(5, '0')}
          </p>
          <button type="button" className="press-start" onClick={restart}>
            {t('arcade.again')}
          </button>
        </div>
      ) : null}
      <p className={hint && !over && hintY ? 'arcade-hint on' : 'arcade-hint'} style={{ top: hintY }} aria-hidden="true">
        {input === 'touch' ? t('arcade.touch') : t('arcade.mouse')}
      </p>
    </div>
  )
}
