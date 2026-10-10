import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArcadeInitials } from '@/components/ArcadeInitials'
import { ArcadePause } from '@/components/ArcadePause'
import { useCrt } from '@/crt/context'
import { bestScore, insertScore, loadScores, qualifies, saveScores, type HighScore } from '@/crt/HighScores'
import { Invaders, type ActivePower, type InputKind, type InvadersHud, type SoundCue, type WaveInfo } from '@/crt/Invaders'
import type { PlayOptions, SoundApi, SoundName } from '@/crt/Sound'
import { POWER_TYPES, type PowerType } from '@/crt/powers'

type Phase = 'play' | 'entry' | 'table'

const BAR = 10
const CALLOUT_MS = 800
const WAVE_MS = 1600
const OVER_DELAY_MS = 320

const CUES: Record<SoundCue, readonly (readonly [SoundName, PlayOptions])[]> = {
  shot: [['shot', { intensity: 0.25 }]],
  laser: [['shot', { intensity: 0.15, duration: 0.2 }]],
  kill: [
    ['generate', { intensity: 1, duration: 0.42, landing: false }],
    ['burst', { intensity: 0.05 }],
  ],
  boom: [['burst', { intensity: 0.4 }]],
  hurt: [['hurt', {}]],
  shield: [['burst', { intensity: 0.2 }]],
  power: [['powerup', {}]],
  glitch: [['tear', { intensity: 0.6 }]],
  clear: [['clear', { intensity: 0.7 }]],
  over: [['over', {}]],
  rocket: [['shot', { intensity: 0.12, duration: 0.28 }]],
  burst: [['burst', { intensity: 0.75 }]],
  boss: [
    ['tear', { intensity: 0.55 }],
    ['burst', { intensity: 0.45 }],
  ],
  enrage: [
    ['tear', { intensity: 0.22 }],
    ['hurt', { intensity: 0.25 }],
  ],
  wow: [
    ['powerup', {}],
    ['burst', { intensity: 0.6 }],
  ],
}

const playCue = (sound: SoundApi, cue: SoundCue, pan: number) => {
  for (const [name, opts] of CUES[cue]) sound.play(name, { ...opts, pan })
}

const debugEnabled = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('invaders-debug')

const SHAKE_KEY = 'cd-arcade-shake'

const readShake = () => {
  try {
    return window.localStorage.getItem(SHAKE_KEY) !== 'off'
  } catch {
    return true
  }
}

const initialInput = (): InputKind => (window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse')

export const Arcade = ({ onExit }: { onExit: () => void }) => {
  const crt = useCrt()
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Invaders | null>(null)
  const [hud, setHud] = useState<InvadersHud>({ score: 0, wave: 1, lives: 3 })
  const [phase, setPhase] = useState<Phase>('play')
  const [scores, setScores] = useState<HighScore[]>(() => loadScores())
  const [result, setResult] = useState({ score: 0, wave: 1 })
  const [rank, setRank] = useState(-1)
  const [waveCall, setWaveCall] = useState<(WaveInfo & { id: number }) | null>(null)
  const scoresRef = useRef(scores)
  const againRef = useRef<HTMLButtonElement>(null)
  const over = phase !== 'play'
  const [hint, setHint] = useState(true)
  const [input, setInput] = useState(initialInput)
  const [hintY, setHintY] = useState(0)
  const [powers, setPowers] = useState<ActivePower[]>([])
  const [callout, setCallout] = useState<{ type: PowerType; id: number } | null>(null)
  const [paused, setPaused] = useState(false)
  const [shake, setShake] = useState(readShake)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let calloutTimer = 0
    let overTimer = 0
    let waveTimer = 0
    const game = new Invaders(
      canvas,
      {
        onHud: setHud,
        onOver: (score, wave) => {
          setResult({ score, wave })
          setRank(-1)
          setPhase(qualifies(scoresRef.current, score) ? 'entry' : 'table')
        },
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
        onTear: (strength) => crt.tear(strength, true),
        onWave: (info) => {
          window.clearTimeout(waveTimer)
          setWaveCall((was) => ({ ...info, id: (was?.id ?? 0) + 1 }))
          waveTimer = window.setTimeout(() => setWaveCall(null), WAVE_MS)
        },
        onPause: setPaused,
        onSound: (cue, pan) => {
          if (cue !== 'over') {
            playCue(crt.sound, cue, pan)
            return
          }
          window.clearTimeout(overTimer)
          overTimer = window.setTimeout(() => playCue(crt.sound, cue, pan), OVER_DELAY_MS)
        },
      },
      initialInput(),
      crt.reduceMotion,
    )
    gameRef.current = game
    game.setShake(readShake())
    game.start()
    rootRef.current?.focus()
    const timer = window.setTimeout(() => setHint(false), 3000)
    const debug = window as unknown as { __invaders?: unknown }
    if (debugEnabled()) {
      debug.__invaders = {
        types: POWER_TYPES,
        give: (type: PowerType) => game.give(type),
        drop: (type: PowerType) => game.drop(type),
        wave: (n: number) => game.jump(n),
        enrage: () => game.enrage(),
        god: (on = true) => game.setGod(on),
        die: () => game.die(),
        stats: () => game.stats(),
      }
    }
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(calloutTimer)
      window.clearTimeout(overTimer)
      window.clearTimeout(waveTimer)
      delete debug.__invaders
      game.destroy()
      gameRef.current = null
    }
  }, [crt])

  const resume = () => {
    gameRef.current?.unpause()
    window.requestAnimationFrame(() => rootRef.current?.focus())
  }

  const toggleShake = (on: boolean) => {
    setShake(on)
    gameRef.current?.setShake(on)
    try {
      window.localStorage.setItem(SHAKE_KEY, on ? 'on' : 'off')
    } catch {
      return
    }
  }

  const pauseOrExit = () => {
    const game = gameRef.current
    if (phase === 'play' && game && !game.isPaused) game.pause()
    else if (phase !== 'play') onExit()
  }

  const restart = () => {
    setPaused(false)
    setPhase('play')
    gameRef.current?.start()
    rootRef.current?.focus()
  }

  const record = (initials: string) => {
    const next = insertScore(scoresRef.current, { initials, score: result.score, wave: result.wave })
    scoresRef.current = next.list
    setScores(next.list)
    setRank(next.rank)
    saveScores(next.list)
    setPhase('table')
  }

  useEffect(() => {
    if (phase === 'table') againRef.current?.focus()
  }, [phase])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const stop = (e: TouchEvent) => e.stopPropagation()
    const hold = (e: TouchEvent) => {
      e.stopPropagation()
      if ((e.target as Element | null)?.closest?.('input')) return
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
        const game = gameRef.current
        if (phase !== 'play' || !game) onExit()
        else if (game.isPaused) {
          game.unpause()
          window.requestAnimationFrame(() => rootRef.current?.focus())
        }
        else game.pause()
        return
      }
      if (phase !== 'table' || (e.key !== 'Enter' && e.key !== ' ')) return
      if ((e.target as Element | null)?.closest?.('button')) return
      e.preventDefault()
      setPhase('play')
      gameRef.current?.start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onExit])

  const best = Math.max(bestScore(scores), hud.score)

  return (
    <div ref={rootRef} className="arcade" data-no-blast role="region" aria-label={t('arcade.label')} tabIndex={-1}>
      <canvas ref={canvasRef} className="arcade-canvas" aria-hidden="true" />
      <div className="arcade-hud">
        <span>
          {t('arcade.score')} <b>{String(hud.score).padStart(5, '0')}</b>
        </span>
        <span>
          {t('arcade.best')} <b>{String(best).padStart(5, '0')}</b>
        </span>
        <span>
          {t('arcade.wave')} <b>{hud.wave}</b>
        </span>
        <span className="arcade-lives" role="img" aria-label={t('arcade.lives', { count: hud.lives })}>
          {Array.from({ length: 3 }, (_, i) => (
            <i key={i} className={i < hud.lives ? 'on' : undefined} />
          ))}
        </span>
        <button type="button" className="arcade-close" aria-label={phase === 'play' ? t('arcade.pause') : t('arcade.close')} onClick={pauseOrExit}>
          <span className="key">esc</span>
          {phase === 'play' ? (
            <span className="pause-icon" aria-hidden="true">
              <i />
              <i />
            </span>
          ) : (
            '×'
          )}
        </button>
      </div>
      <ul className="arcade-powers" aria-label={t('arcade.powers')}>
        {powers.map((power) => (
          <li key={power.type}>
            <span>
              {t(`arcade.power.${power.type}`)}
              {power.count && power.count > 1 ? ` ×${power.count}` : null}
            </span>
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
      {waveCall ? (
        <p key={`wave-${waveCall.id}`} className="arcade-callout arcade-wave" aria-hidden="true">
          <span>
            {t('arcade.wave')} {waveCall.wave}
          </span>
          {waveCall.boss ? t(`arcade.boss.${waveCall.boss}`) : t(`arcade.waves.${waveCall.formation}`)}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {waveCall ? `${t('arcade.wave')} ${waveCall.wave}` : ''}
      </p>
      {paused && phase === 'play' ? <ArcadePause shake={shake} onShake={toggleShake} onResume={resume} onExit={onExit} /> : null}
      {phase === 'entry' ? (
        <div className="arcade-over">
          <ArcadeInitials score={result.score} onDone={record} />
        </div>
      ) : null}
      {phase === 'table' ? (
        <div className="arcade-over">
          <p className="arcade-over-title">{t('arcade.over')}</p>
          <p className="arcade-over-score">
            {t('arcade.score')} {String(result.score).padStart(6, '0')} · {t('arcade.wave')} {result.wave}
          </p>
          <table className="arcade-table">
            <caption>{t('arcade.top')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('arcade.rank')}</th>
                <th scope="col">{t('arcade.name')}</th>
                <th scope="col">{t('arcade.score')}</th>
              </tr>
            </thead>
            <tbody>
              {scores.length ? (
                scores.map((entry, index) => (
                  <tr key={`${index}-${entry.initials}-${entry.score}`} className={index === rank ? 'new' : undefined} aria-current={index === rank ? 'true' : undefined}>
                    <td>{index + 1}</td>
                    <td>{entry.initials}</td>
                    <td>{String(entry.score).padStart(6, '0')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>{t('arcade.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="arcade-actions">
            <button ref={againRef} type="button" className="press-start" onClick={restart}>
              {t('arcade.again')}
            </button>
            <button type="button" className="arcade-exit" onClick={onExit}>
              {t('arcade.exit')}
            </button>
          </div>
        </div>
      ) : null}
      <p className={hint && !over && hintY ? 'arcade-hint on' : 'arcade-hint'} style={{ top: hintY }} aria-hidden="true">
        {input === 'touch' ? t('arcade.touch') : t('arcade.mouse')}
      </p>
    </div>
  )
}
