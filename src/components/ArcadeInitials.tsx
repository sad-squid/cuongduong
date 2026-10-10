import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ALPHABET } from '@/crt/HighScores'

const SLOTS = 3

export const ArcadeInitials = ({ score, onDone, onChange }: { score: number; onDone: (initials: string) => void; onChange: (initials: string) => void }) => {
  const { t } = useTranslation()
  const [letters, setLetters] = useState([0, 0, 0])
  const [slot, setSlot] = useState(0)
  const refs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    refs.current[slot]?.focus()
  }, [slot])

  const spin = (index: number, step: number) => setLetters((was) => was.map((v, k) => (k === index ? (v + step + ALPHABET.length) % ALPHABET.length : v)))

  const focus = (index: number) => {
    const next = Math.max(0, Math.min(SLOTS - 1, index))
    setSlot(next)
    refs.current[next]?.focus()
  }

  const initials = letters.map((v) => ALPHABET[v]).join('')

  useEffect(() => onChange(initials), [initials, onChange])

  const confirm = () => onDone(initials)

  const onKey = (e: KeyboardEvent<HTMLSpanElement>, index: number) => {
    const key = e.key
    if (key === 'ArrowUp') spin(index, 1)
    else if (key === 'ArrowDown') spin(index, -1)
    else if (key === 'ArrowLeft' || key === 'Backspace') focus(index - 1)
    else if (key === 'ArrowRight') focus(index + 1)
    else if (key === 'Enter') confirm()
    else if (key.length === 1 && /[a-z]/i.test(key)) {
      const value = ALPHABET.indexOf(key.toUpperCase())
      setLetters((was) => was.map((v, k) => (k === index ? value : v)))
      focus(index + 1)
    } else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className="arcade-initials" role="group" aria-labelledby="arcade-initials-title" aria-describedby="arcade-initials-help">
      <p id="arcade-initials-title" className="arcade-over-title">
        {t('arcade.newHigh')}
      </p>
      <p className="arcade-over-score">
        {t('arcade.score')} {String(score).padStart(6, '0')}
      </p>
      <p id="arcade-initials-help" className="arcade-initials-help">
        {t('arcade.initials')}
      </p>
      <div className="arcade-slots">
        {letters.map((value, index) => (
          <div key={index} className={index === slot ? 'arcade-slot on' : 'arcade-slot'}>
            <button
              type="button"
              tabIndex={-1}
              aria-label={t('arcade.letterUp', { n: index + 1 })}
              onClick={() => {
                spin(index, 1)
                focus(index)
              }}
            >
              ▲
            </button>
            <span
              ref={(node) => {
                refs.current[index] = node
              }}
              role="spinbutton"
              tabIndex={0}
              aria-label={t('arcade.letter', { n: index + 1 })}
              aria-valuemin={0}
              aria-valuemax={ALPHABET.length - 1}
              aria-valuenow={value}
              aria-valuetext={ALPHABET[value]}
              className="arcade-letter"
              onFocus={() => setSlot(index)}
              onKeyDown={(e) => onKey(e, index)}
            >
              {ALPHABET[value]}
            </span>
            <button
              type="button"
              tabIndex={-1}
              aria-label={t('arcade.letterDown', { n: index + 1 })}
              onClick={() => {
                spin(index, -1)
                focus(index)
              }}
            >
              ▼
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="press-start arcade-ok" onClick={confirm}>
        {t('arcade.ok')}
      </button>
    </div>
  )
}
