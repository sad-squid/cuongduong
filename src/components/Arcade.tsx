import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { Invaders, type ActivePower, type InputKind, type InvadersHud } from '@/crt/Invaders'
import { POWER_TYPES, type PowerType } from '@/crt/powers'

const BAR = 10
const CALLOUT_MS = 800

const debugEnabled = () => import.meta.env.DEV || new URLSearchParams(window.location.search).has('invaders-debug')

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
  const [powers, setPowers] = useState<ActivePower[]>([])
  const [callout, setCallout] = useState<{ type: PowerType; id: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let calloutTimer = 0
    const game = new Invaders(
      canvas,
      {
        onHud: setHud,
        onOver: () => setOver(true),
        onHit: (x, y) => crt.ripple(x, y),
        onInput: setInput,
        onShot: () => setHint(false),
        onLayout: setHintY,
        onPowers: setPowers,
        onPower: (type) => {
          window.clearTimeout(calloutTimer)
          setCallout((was) => ({ type, id: (was?.id ?? 0) + 1 }))
          calloutTimer = window.setTimeout(() => setCallout(null), CALLOUT_MS)
        },
        onGlitch: () => crt.tear(1.8, true),
      },
      initialInput(),
      crt.reduceMotion,
    )
    gameRef.current = game
    game.start()
    rootRef.current?.focus()
    const timer = window.setTimeout(() => setHint(false), 3000)
    const debug = window as unknown as { __invaders?: unknown }
    if (debugEnabled()) debug.__invaders = { types: POWER_TYPES, give: (type: PowerType) => game.give(type), drop: (type: PowerType) => game.drop(type) }
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(calloutTimer)
      delete debug.__invaders
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
      <ul className="arcade-powers" aria-label={t('arcade.powers')}>
        {powers.map((power) => (
          <li key={power.type}>
            <span>{t(`arcade.power.${power.type}`)}</span>
            <span className="arcade-bar" aria-hidden="true">
              {Array.from({ length: BAR }, (_, i) => (
                <i key={i} className={i < Math.ceil(power.left * BAR) ? 'on' : undefined} />
              ))}
            </span>
          </li>
        ))}
      </ul>
      {callout ? (
        <p key={callout.id} className="arcade-callout" aria-hidden="true">
          {t(`arcade.power.${callout.type}`)}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {callout ? t(`arcade.power.${callout.type}`) : ''}
      </p>
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
