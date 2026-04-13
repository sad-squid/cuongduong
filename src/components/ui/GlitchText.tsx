import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Box } from '@mui/material'
import { useColors } from '@/theme/ThemeContext'
import type { ThemePalette } from '@/theme/palettes'

// --- Utils ---

const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min

const randInt = (min: number, max: number) =>
  Math.floor(rand(min, max + 1))

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
}

const buildGlitchPalette = (c: ThemePalette) => [c.coral, c.teal, c.dustyRose, c.warmCoral, c.rose]

// --- Glitch state generation ---

interface GlitchParams {
  movementIntensity: number
  colorIntensity: number
  layerCount: number
  baseObscureChance: number
  scanlineIntensity: number
}

const generateParams = (): GlitchParams => ({
  movementIntensity: rand(0.3, 1.0),
  colorIntensity: rand(0.3, 1.0),
  layerCount: randInt(2, 6),
  baseObscureChance: rand(0, 0.12),
  scanlineIntensity: rand(0.2, 1.0),
})

const generateShadows = (params: GlitchParams, intensity = 1, palette: string[] = []): string => {
  const { movementIntensity, colorIntensity, layerCount } = params
  const shadows: string[] = []

  const minColor = palette[randInt(0, 2)]
  const minX = rand(0.8, 2.5) * (Math.random() > 0.5 ? 1 : -1) * Math.max(movementIntensity, 0.4)
  const minY = rand(-0.5, 0.5) * Math.max(movementIntensity, 0.4)
  const minAlpha = Math.max(0.25, 0.2 + colorIntensity * 0.35) * intensity
  shadows.push(`${minX.toFixed(1)}px ${minY.toFixed(1)}px 0 ${hexToRgba(minColor, minAlpha)}`)

  for (let i = 1; i < layerCount; i++) {
    const color = palette[randInt(0, palette.length - 1)]
    const maxOffset = 3 + movementIntensity * 8
    const x = rand(-maxOffset, maxOffset)
    const y = rand(-maxOffset * 0.4, maxOffset * 0.4)
    const alpha = rand(0.08, 0.5) * colorIntensity * intensity
    const blur = Math.random() > 0.7 ? rand(0, 2) : 0
    shadows.push(`${x.toFixed(1)}px ${y.toFixed(1)}px ${blur.toFixed(1)}px ${hexToRgba(color, Math.max(0.05 * intensity, alpha))}`)
  }

  return shadows.join(', ')
}

interface ScanLine {
  top: number
  height: number
  opacity: number
  color: string
  offsetX: number
}

const generateScanLines = (intensity: number, palette: string[], bg: string): ScanLine[] => {
  const count = randInt(1, Math.ceil(2 + intensity * 4))
  const lines: ScanLine[] = []

  for (let i = 0; i < count; i++) {
    const isTinted = Math.random() > 0.5
    lines.push({
      top: rand(0, 95),
      height: rand(1, 4 + intensity * 8),
      opacity: Math.min(1, rand(0.3, 0.7 + intensity * 0.3)),
      color: isTinted
        ? hexToRgba(palette[randInt(0, 2)], Math.min(1, rand(0.05, 0.2) * intensity))
        : bg,
      offsetX: rand(-3, 3) * intensity,
    })
  }

  return lines
}

// --- Component ---

interface GlitchTextProps {
  children: React.ReactNode
  /** hover: on mouse enter/leave. click: burst on click. auto: random periodic bursts. */
  type?: 'hover' | 'click' | 'auto'
  component?: React.ElementType
  /** Scale shadow alpha values (0–1). Useful for low-opacity text. */
  intensity?: number
  /** If set, glitch activates in the last 500ms of each interval and the first 500ms of the next. Independent of type. */
  transitionDelay?: number
  /** Text variants that briefly flash over the base text. Cycles on hover; also fires randomly at idle. */
  hoverTexts?: string[]
  /** Boost scanline opacity/color for small text (default 1). Values >1 increase visibility. */
  scanlineBoost?: number
  /** Fire a single glitch burst on mount */
  autoOnMount?: boolean
  /** When true, each trigger cycles through [base, ...hoverTexts] and stays on the new variant until next trigger. */
  sticky?: boolean
}

const FLASH_DURATION = 400
const FLASH_GAP = 1200

const isCaptureMode = () => {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('capture') === '1'
}

const emitGlitch = () => {
  if (typeof window === 'undefined') return
  const cb = (window as unknown as { __onGlitch__?: (t: number) => void }).__onGlitch__
  cb?.(performance.now())
}

export const GlitchText = ({
  children,
  type = 'auto',
  component = 'span',
  intensity = 1,
  transitionDelay,
  hoverTexts,
  scanlineBoost = 1,
  autoOnMount = false,
  sticky = false,
}: GlitchTextProps) => {
  const colors = useColors()
  const glitchPalette = useMemo(() => buildGlitchPalette(colors), [colors])
  const [glitching, setGlitching] = useState(false)
  const [textShadow, setTextShadow] = useState('none')
  const [baseOpacity, setBaseOpacity] = useState(1)
  const [scanLineState, setScanLineState] = useState<ScanLine[]>([])
  const paramsRef = useRef<GlitchParams>(generateParams())
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionStartRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [overrideText, setOverrideText] = useState<string | null>(null)
  const flashTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const idleFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveringRef = useRef(false)
  const hoverIndexRef = useRef(0)
  const stickyIndexRef = useRef(-1)

  const clearFlashTimers = useCallback(() => {
    flashTimersRef.current.forEach((id) => clearTimeout(id))
    flashTimersRef.current.clear()
  }, [])

  const queueFlash = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      flashTimersRef.current.delete(id)
      fn()
    }, ms)
    flashTimersRef.current.add(id)
    return id
  }, [])

  const startGlitch = useCallback(() => {
    paramsRef.current = generateParams()
    setGlitching(true)
    emitGlitch()
  }, [])

  const stopGlitch = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    setGlitching(false)
    setTextShadow('none')
    setBaseOpacity(1)
    setScanLineState([])
  }, [])

  const hardReset = useCallback(() => {
    clearFlashTimers()
    if (idleFlashRef.current) clearTimeout(idleFlashRef.current)
    setOverrideText(null)
    stopGlitch()
  }, [clearFlashTimers, stopGlitch])

  // Animation tick loop
  useEffect(() => {
    if (!glitching) return

    const tick = () => {
      const p = paramsRef.current
      setTextShadow(generateShadows(p, intensity, glitchPalette))
      setScanLineState(generateScanLines(p.scanlineIntensity * scanlineBoost, glitchPalette, colors.bg))

      if (Math.random() < p.baseObscureChance) {
        setBaseOpacity(rand(0, 0.15))
      } else {
        setBaseOpacity(1)
      }

      p.movementIntensity = Math.min(1, Math.max(0.3, p.movementIntensity + rand(-0.05, 0.05)))
      p.colorIntensity = Math.min(1, Math.max(0.3, p.colorIntensity + rand(-0.05, 0.05)))
      p.scanlineIntensity = Math.min(1, Math.max(0.2, p.scanlineIntensity + rand(-0.04, 0.04)))
    }

    tick()
    const interval = rand(50, 110)
    tickRef.current = setInterval(tick, interval)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [glitching])

  const flashText = useCallback(
    (text: string, onDone?: () => void) => {
      clearFlashTimers()
      startGlitch()
      setOverrideText(text)
      queueFlash(() => {
        startGlitch()
        setOverrideText(null)
        queueFlash(() => {
          stopGlitch()
          onDone?.()
        }, rand(150, 300))
      }, FLASH_DURATION)
    },
    [startGlitch, stopGlitch, clearFlashTimers, queueFlash],
  )

  const triggerStickyFlash = useCallback(() => {
    if (!hoverTexts?.length) return
    clearFlashTimers()
    stickyIndexRef.current = (stickyIndexRef.current + 1) % (hoverTexts.length + 1)
    const idx = stickyIndexRef.current - 1
    const nextText = idx >= 0 ? hoverTexts[idx] : null
    startGlitch()
    queueFlash(() => {
      setOverrideText(nextText)
      queueFlash(() => stopGlitch(), rand(150, 300))
    }, FLASH_DURATION)
  }, [hoverTexts, startGlitch, stopGlitch, clearFlashTimers, queueFlash])

  // Hover mode — cycle through hoverTexts: flash each one, return to original, repeat
  const startHoverCycle = useCallback(() => {
    if (!hoverTexts?.length) return
    const cycleNext = () => {
      if (!hoveringRef.current) return
      const text = hoverTexts[hoverIndexRef.current % hoverTexts.length]
      hoverIndexRef.current++
      flashText(text, () => {
        if (!hoveringRef.current) return
        queueFlash(cycleNext, FLASH_GAP)
      })
    }
    queueFlash(cycleNext, FLASH_GAP)
  }, [hoverTexts, flashText, queueFlash])

  // One-shot glitch on mount
  useEffect(() => {
    if (!autoOnMount) return
    const t = setTimeout(() => {
      startGlitch()
      setTimeout(() => stopGlitch(), 300)
    }, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto mode — random periodic bursts
  useEffect(() => {
    if (type !== 'auto') return

    const scheduleNext = () => {
      const delay = rand(3000, 10000)
      autoTimerRef.current = setTimeout(() => {
        startGlitch()
        const duration = rand(150, 400)
        setTimeout(() => {
          stopGlitch()
          scheduleNext()
        }, duration)
      }, delay)
    }

    scheduleNext()
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [type, startGlitch, stopGlitch])

  // Idle text flashes — randomly flash a hoverText variant when not hovering
  useEffect(() => {
    if (!hoverTexts?.length) return
    if (sticky) return

    const capture = isCaptureMode()
    const idleMin = capture ? 400 : 5000
    const idleMax = capture ? 900 : 12000
    let idx = 0
    const scheduleIdle = () => {
      idleFlashRef.current = setTimeout(() => {
        if (hoveringRef.current) {
          scheduleIdle()
          return
        }
        const text = capture
          ? hoverTexts[idx++ % hoverTexts.length]
          : hoverTexts[randInt(0, hoverTexts.length - 1)]
        flashText(text, scheduleIdle)
      }, rand(idleMin, idleMax))
    }

    scheduleIdle()
    return () => {
      if (idleFlashRef.current) clearTimeout(idleFlashRef.current)
    }
  }, [hoverTexts, flashText])

  // Transition delay — glitch spans the last 500ms of each interval and first 500ms of the next
  useEffect(() => {
    if (!transitionDelay) return
    const OVERLAP = 500

    const scheduleCycle = (firstQuiet: number) => {
      transitionStartRef.current = setTimeout(() => {
        startGlitch()
        transitionStopRef.current = setTimeout(() => {
          stopGlitch()
          scheduleCycle(transitionDelay - OVERLAP * 2)
        }, OVERLAP * 2)
      }, firstQuiet)
    }

    scheduleCycle(transitionDelay - OVERLAP)

    return () => {
      if (transitionStartRef.current) clearTimeout(transitionStartRef.current)
      if (transitionStopRef.current) clearTimeout(transitionStopRef.current)
    }
  }, [transitionDelay, startGlitch, stopGlitch])

  const hoverHandlers = useMemo(() => {
    if (type !== 'hover') return {}
    if (sticky) {
      return { onMouseEnter: triggerStickyFlash }
    }
    return {
      onMouseEnter: () => {
        startGlitch()
        hoveringRef.current = true
        hoverIndexRef.current = 0
        startHoverCycle()
      },
      onMouseLeave: () => {
        hoveringRef.current = false
        hardReset()
      },
    }
  }, [type, sticky, triggerStickyFlash, startGlitch, hardReset, startHoverCycle])

  // Hard-reset when children (translated text) or palette (theme) change mid-flash
  useEffect(() => {
    hardReset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, glitchPalette])

  // Hard-reset when the tab is hidden so nothing stays stuck while away
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') hardReset()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [hardReset])

  // Cleanup all timers on unmount
  useEffect(() => () => clearFlashTimers(), [clearFlashTimers])

  const clickHandler = useMemo(() => {
    if (type !== 'click') return {}
    if (sticky) return { onClick: triggerStickyFlash }
    return {
      onClick: () => {
        startGlitch()
        setTimeout(stopGlitch, rand(150, 350))
      },
    }
  }, [type, sticky, triggerStickyFlash, startGlitch, stopGlitch])

  return (
    <Box
      component={component}
      {...hoverHandlers}
      {...clickHandler}
      sx={{
        display: 'inline-block',
        position: 'relative',
        cursor: type === 'hover' ? 'default' : undefined,
        textShadow,
        transition: glitching
          ? 'text-shadow 0.07s ease, opacity 0.1s ease'
          : 'text-shadow 0.25s ease-out, opacity 0.2s ease-out',
        overflow: 'hidden',
        '& > *': {
          opacity: baseOpacity,
          transition: 'opacity 0.1s ease',
        },
      }}
    >
      {overrideText ?? children}

      {scanLineState.length > 0 && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {scanLineState.map((line, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${line.top}%`,
                height: `${line.height}%`,
                backgroundColor: line.color,
                opacity: line.opacity,
                transform: `translateX(${line.offsetX}px)`,
                transition: 'top 0.06s ease, height 0.06s ease, opacity 0.08s ease, transform 0.06s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
