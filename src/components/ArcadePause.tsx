import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { levelToVolume, readLevel, writeLevel } from '@/crt/soundLevel'

type View = 'menu' | 'options'

export const ArcadePause = ({ shake, onShake, onResume, onExit }: { shake: boolean; onShake: (on: boolean) => void; onResume: () => void; onExit: () => void }) => {
  const crt = useCrt()
  const { t } = useTranslation()
  const [view, setView] = useState<View>('menu')
  const [on, setOn] = useState(crt.sound.enabled)
  const [level, setLevel] = useState(readLevel)
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [view])

  const enable = (next: boolean) => {
    crt.sound.setEnabled(next)
    if (next) crt.sound.play('toggle')
    setOn(next)
    crt.soundChanged()
  }

  const slide = (value: number) => {
    setLevel(value)
    writeLevel(value)
    crt.sound.setSettings({ volume: levelToVolume(value) })
    if (value === 0 && on) enable(false)
    else if (value > 0 && !on) enable(true)
    else {
      if (value > 0) crt.sound.play('tick')
      crt.soundChanged()
    }
  }

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button, input'))
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="arcade-over arcade-pause" role="dialog" aria-modal="true" aria-labelledby="arcade-pause-title" onKeyDown={trap}>
      <p id="arcade-pause-title" className="arcade-over-title">
        {view === 'menu' ? t('arcade.paused') : t('arcade.options')}
      </p>
      {view === 'menu' ? (
        <div className="arcade-menu">
          <button ref={firstRef} type="button" className="press-start" onClick={onResume}>
            {t('arcade.resume')}
          </button>
          <button type="button" className="arcade-exit" onClick={() => setView('options')}>
            {t('arcade.options')}
          </button>
          <button type="button" className="arcade-exit" onClick={onExit}>
            {t('arcade.exit')}
          </button>
        </div>
      ) : (
        <div className="arcade-menu">
          <button ref={firstRef} type="button" className="arcade-option" aria-pressed={on} onClick={() => enable(!on)}>
            <span>{t('arcade.sound')}</span>
            <b>{on ? t('arcade.on') : t('arcade.off')}</b>
          </button>
          <label className="arcade-option arcade-volume">
            <span>{t('arcade.volume')}</span>
            <span className="volume" style={{ '--fill': `${on ? level : 0}%` } as CSSProperties}>
              <input type="range" min={0} max={100} step={5} value={on ? level : 0} onChange={(e) => slide(Number(e.currentTarget.value))} />
            </span>
          </label>
          <button type="button" className="arcade-option" aria-pressed={shake} onClick={() => onShake(!shake)}>
            <span>{t('arcade.shake')}</span>
            <b>{shake ? t('arcade.on') : t('arcade.off')}</b>
          </button>
          <button type="button" className="arcade-exit" onClick={() => setView('menu')}>
            {t('arcade.back')}
          </button>
        </div>
      )}
    </div>
  )
}
