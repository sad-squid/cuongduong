import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { LINKS, SITE_LANGS } from '@/content/names'

type Command = { id: string; label: string; hint: string; run: () => void }

export const CommandPalette = () => {
  const crt = useCrt()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      { id: 'home', label: 'home', hint: t('palette.home'), run: () => navigate({ to: '/' }) },
      { id: 'about', label: 'about', hint: t('palette.about'), run: () => navigate({ to: '/about' }) },
      { id: 'work', label: 'work', hint: t('palette.work'), run: () => navigate({ to: '/work' }) },
      { id: 'github', label: 'github', hint: 'github.com/sad-squid', run: () => window.location.assign(LINKS.github) },
      { id: 'linkedin', label: 'linkedin', hint: 'linkedin.com/in/cuongduong-dev', run: () => window.location.assign(LINKS.linkedin) },
      ...SITE_LANGS.map((code) => ({ id: `lang-${code}`, label: `lang ${code}`, hint: t(`palette.lang.${code}`), run: () => i18n.changeLanguage(code) })),
    ]
    return path === '/' ? [...list, { id: 'replay', label: 'replay', hint: t('palette.replay'), run: () => crt.replay() }] : list
  }, [t, i18n, navigate, path, crt])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? commands.filter((c) => c.label.includes(q) || c.hint.toLowerCase().includes(q)) : commands
  }, [commands, query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((was) => {
          if (!was) returnFocus.current = document.activeElement as HTMLElement | null
          return !was
        })
        setQuery('')
        setActive(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else returnFocus.current?.focus?.()
  }, [open])

  const close = () => setOpen(false)

  const runAt = (index: number) => {
    const command = matches[index]
    if (!command) return
    close()
    command.run()
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (matches.length ? (i + 1) % matches.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (matches.length ? (i - 1 + matches.length) % matches.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runAt(active)
    }
  }

  if (!open) return null

  const current = Math.min(active, Math.max(0, matches.length - 1))

  return (
    <div className="palette-backdrop" onPointerDown={(e) => (e.target === e.currentTarget ? close() : null)}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t('palette.label')}>
        <label className="palette-prompt">
          <span aria-hidden="true">&gt;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={matches[current] ? `cmd-${matches[current].id}` : undefined}
            aria-label={t('palette.input')}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <ul id="palette-list" role="listbox" className="palette-list">
          {matches.map((command, i) => (
            <li
              key={command.id}
              id={`cmd-${command.id}`}
              role="option"
              aria-selected={i === current}
              className={i === current ? 'on' : undefined}
              onPointerEnter={() => setActive(i)}
              onClick={() => runAt(i)}
            >
              <span className="cmd">{command.label}</span>
              <span className="hint">{command.hint}</span>
            </li>
          ))}
          {matches.length ? null : <li className="empty">{t('palette.empty')}</li>}
        </ul>
      </div>
    </div>
  )
}
