import { useCallback, useEffect, useRef, useState } from 'react'
import { SCRAMBLE_GLYPHS } from '@/crt/TaglineStore'

const TICKS = 8
const TICK_MS = 40

const glyphsFor = (text: string) => {
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(text)) return SCRAMBLE_GLYPHS.ja
  if (/[^\u0020-\u007e]/.test(text)) return SCRAMBLE_GLYPHS.vi
  return text === text.toUpperCase() ? SCRAMBLE_GLYPHS.en.toUpperCase() : SCRAMBLE_GLYPHS.en
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
