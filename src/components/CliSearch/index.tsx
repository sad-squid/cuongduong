import { useState, useRef, useEffect, useCallback } from 'react'
import { Box, Typography, Fade } from '@mui/material'
import { useNavigate } from '@tanstack/react-router'
import { SPACE_MONO } from '@/theme'
import { useColors } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

interface SearchItem {
  key: 'home' | 'work' | 'about'
  path: string
  keywords: string[]
  description: string
}

const SEARCH_ITEMS: SearchItem[] = [
  { key: 'home', path: '/', keywords: ['index', 'hero', 'landing', 'main'], description: '~/' },
  { key: 'work', path: '/work', keywords: ['projects', 'portfolio', 'case studies'], description: '~/work' },
  { key: 'about', path: '/about', keywords: ['bio', 'cuong', 'who', 'info', 'resume'], description: '~/about' },
]

function filterItems(query: string, labelFor: (k: SearchItem['key']) => string): SearchItem[] {
  if (!query) return SEARCH_ITEMS
  const q = query.toLowerCase()
  return SEARCH_ITEMS.filter(
    (item) =>
      item.key.includes(q) ||
      labelFor(item.key).toLowerCase().includes(q) ||
      item.path.includes(q) ||
      item.keywords.some((k) => k.includes(q)),
  )
}

function BlockCursor() {
  const c = useColors()
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 8,
        height: '1.2em',
        ml: 0.25,
        position: 'relative',
        top: '0.18em',
        backgroundColor: c.coral,
        animation: 'blink 1.2s steps(1) infinite',
        '@keyframes blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
      }}
    />
  )
}

interface CliSearchProps {
  open: boolean
  onClose: () => void
}

export function CliSearch({ open, onClose }: CliSearchProps) {
  const c = useColors()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [rawActiveIndex, setActiveIndex] = useState(0)
  const [prevOpen, setPrevOpen] = useState(open)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const labelFor = (k: SearchItem['key']) => t(`nav.${k}`)
  const results = filterItems(query, labelFor)
  const activeIndex = Math.min(rawActiveIndex, Math.max(results.length - 1, 0))

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const go = useCallback(
    (path: string) => {
      onClose()
      navigate({ to: path })
    },
    [navigate, onClose],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + results.length) % results.length)
        break
      case 'Enter':
        if (results[activeIndex]) go(results[activeIndex].path)
        break
      case 'Tab':
        e.preventDefault()
        if (results[activeIndex]) {
          setQuery(labelFor(results[activeIndex].key))
        }
        break
    }
  }

  if (!open) return null

  return (
    <Box ref={containerRef} sx={{ position: 'relative', display: 'flex', alignItems: 'baseline' }}>
      <Box
        component="input"
        ref={inputRef}
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        aria-label="Search site"
        sx={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'baseline',
          fontFamily: SPACE_MONO,
          fontSize: '1rem',
          cursor: 'text',
          position: 'relative',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {!query && (
          <Typography
            component="span"
            aria-hidden="true"
            sx={{
              position: 'absolute',
              left: 0,
              fontFamily: SPACE_MONO,
              fontSize: '1rem',
              color: c.beige,
              opacity: 0.3,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              bottom: 0,
            }}
          >
            cd{'  '}{t('search.placeholder')}
          </Typography>
        )}
        <Typography
          component="span"
          sx={{
            fontFamily: SPACE_MONO,
            fontSize: '1rem',
            fontWeight: 700,
            color: c.cream,
          }}
        >
          cd
        </Typography>
        {query && (
          <Typography
            component="span"
            sx={{
              fontFamily: SPACE_MONO,
              fontSize: '1rem',
              color: c.cream,
              ml: 0.75,
              whiteSpace: 'pre',
            }}
          >
            {query}
          </Typography>
        )}
        <BlockCursor />
      </Box>

      {/* Dropdown results */}
      <Box
        sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          mt: 2,
          width: { xs: '90vw', sm: 400 },
          backgroundColor: c.surface,
          border: `1px solid ${c.rose}`,
          borderRadius: 1,
          py: 1,
          zIndex: 10001,
          boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 20px ${c.coral}08`,
        }}
      >
        {results.map((item, i) => (
          <Box
            key={item.key}
            onClick={() => go(item.path)}
            onMouseEnter={() => setActiveIndex(i)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 1,
              cursor: 'pointer',
              backgroundColor: i === activeIndex ? `${c.coral}12` : 'transparent',
              borderLeft: i === activeIndex ? `2px solid ${c.coral}` : '2px solid transparent',
              transition: 'background-color 0.1s, border-color 0.1s',
            }}
          >
            <Typography
              sx={{
                fontFamily: SPACE_MONO,
                fontSize: '0.85rem',
                color: i === activeIndex ? c.cream : c.beige,
                fontWeight: i === activeIndex ? 700 : 400,
              }}
            >
              {labelFor(item.key)}
            </Typography>
            <Typography
              sx={{
                fontFamily: SPACE_MONO,
                fontSize: '0.7rem',
                color: c.roseText,
                opacity: i === activeIndex ? 1 : 0.6,
              }}
            >
              {item.description}
            </Typography>
          </Box>
        ))}

        {results.length === 0 && (
          <Typography
            sx={{
              fontFamily: SPACE_MONO,
              fontSize: '0.8rem',
              color: c.beige,
              opacity: 0.5,
              px: 1.5,
              py: 1.5,
            }}
          >
            {t('search.noMatch')}
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 0.5,
            mx: 1.5,
            pt: 1,
            borderTop: `1px solid ${c.rose}33`,
          }}
        >
          {[
            { key: '↑↓', action: t('search.kbdNavigate') },
            { key: 'tab', action: t('search.kbdComplete') },
            { key: '↵', action: t('search.kbdGo') },
            { key: 'esc', action: t('search.kbdClose') },
          ].map(({ key, action }) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                component="kbd"
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.55rem',
                  color: c.cream,
                  backgroundColor: `${c.rose}33`,
                  border: `1px solid ${c.rose}55`,
                  borderRadius: '3px',
                  px: 0.5,
                  py: 0.15,
                  lineHeight: 1.4,
                }}
              >
                {key}
              </Box>
              <Typography
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.55rem',
                  color: c.beige,
                  opacity: 0.5,
                }}
              >
                {action}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export function SearchBackdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <Fade in={open}>
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          backgroundColor: 'rgba(26, 26, 27, 0.8)',
          backdropFilter: 'blur(6px)',
        }}
      />
    </Fade>
  )
}
