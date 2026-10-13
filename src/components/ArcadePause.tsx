import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'

type View = 'menu' | 'options'

export const ArcadePause = ({ shake, onShake, onResume, onExit }: { shake: boolean; onShake: (on: boolean) => void; onResume: () => void; onExit: () => void }) => {
  const crt = useCrt()
  const { t } = useTranslation()
  const [view, setView] = useState<View>('menu')
  const [on, setOn] = useState(!crt.sound.muted)
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [view])

  useEffect(() => crt.subscribe((event) => (event.type === 'sound' ? setOn(!crt.sound.muted) : undefined)), [crt])

  const enable = (next: boolean) => {
    crt.sound.setMuted(!next)
    if (next) crt.sound.play('toggle')
    setOn(next)
    crt.soundChanged()
  }

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button'))
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
