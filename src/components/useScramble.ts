import { useCallback, useEffect, useRef, useState } from 'react'

const TICKS = 8
const TICK_MS = 40

export const LABEL_GLYPHS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  ja: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  vi: 'aăâbcdđeêghiklmnoôơpqrstuưvxyàảãáạằắặầấậèẻéẹềếệìíịòỏóọồốộờớợùủúụừứựỳýỵ',
}

export const glyphsFor = (text: string) => {
  if (/[぀-ヿ一-鿿]/.test(text)) return LABEL_GLYPHS.ja
  if (/[^ -~]/.test(text)) return LABEL_GLYPHS.vi
  return text === text.toUpperCase() ? LABEL_GLYPHS.upper : LABEL_GLYPHS.lower
}

export const useScramble = (label: string, reduceMotion: boolean) => {
  const [state, setState] = useState({ source: label, text: label })
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const trigger = useCallback(() => {
    if (reduceMotion) return
    window.clearTimeout(timer.current)
    const set = glyphsFor(label)
    let k = 0
    const step = () => {
      k++
      const revealed = Math.floor((k / TICKS) * label.length)
      const text = Array.from(label, (ch, i) => (i < revealed || ch === ' ' ? ch : set[Math.floor(Math.random() * set.length)])).join('')
      setState({ source: label, text: k >= TICKS ? label : text })
      if (k < TICKS) timer.current = window.setTimeout(step, TICK_MS)
    }
    step()
  }, [label, reduceMotion])

  return [state.source === label ? state.text : label, trigger] as const
}
