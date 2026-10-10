import { useMemo, useSyncExternalStore, type ReactNode, type Ref } from 'react'
import { phraseStarts, type Chunk, type TaglineStore } from '@/crt/TaglineStore'

type TaglineProps = { store: TaglineStore; text: string; lang: string; lit: boolean; ref: Ref<HTMLParagraphElement> }

const renderChunk = (chunk: Chunk, key: string): ReactNode => {
  if (chunk.kind === 'plain') return chunk.text
  if (chunk.kind === 'beam')
    return (
      <span key={key} className="beam">
        {chunk.text}
      </span>
    )
  if (chunk.kind === 'glow')
    return (
      <span key={key} className={`glow-${chunk.level}`}>
        {chunk.text}
      </span>
    )
  return (
    <span key={key} className="slot">
      <span className="ghost">{chunk.text}</span>
      <span className="glyph">{chunk.glyph}</span>
    </span>
  )
}

const inPhrases = (chunks: Chunk[], starts: number[]) => {
  const groups: ReactNode[][] = [[]]
  let offset = 0
  let next = 0
  chunks.forEach((chunk, i) => {
    const end = offset + chunk.text.length
    let from = offset
    while (chunk.kind !== 'slot' && next < starts.length && starts[next] < end) {
      const cut = starts[next]
      next++
      if (cut <= from) {
        if (groups[groups.length - 1].length) groups.push([])
        continue
      }
      groups[groups.length - 1].push(renderChunk({ ...chunk, text: chunk.text.slice(from - offset, cut - offset) }, `${i}-${from}`))
      groups.push([])
      from = cut
    }
    if (chunk.kind === 'slot') {
      while (next < starts.length && starts[next] <= offset) {
        next++
        if (groups[groups.length - 1].length) groups.push([])
      }
      groups[groups.length - 1].push(renderChunk(chunk, `${i}`))
    } else if (from < end) groups[groups.length - 1].push(renderChunk({ ...chunk, text: chunk.text.slice(from - offset) }, `${i}-${from}`))
    offset = end
  })
  return groups.map((group, i) => (
    <span key={i} className="phrase">
      {group}
    </span>
  ))
}

export const Tagline = ({ store, text, lang, lit, ref }: TaglineProps) => {
  const chunks = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const starts = useMemo(() => (lang === 'ja' ? phraseStarts(text) : []), [lang, text])

  return (
    <>
      <p className="sr-only" lang={lang}>
        {text}
      </p>
      <p ref={ref} className={lit ? 'tagline lit' : 'tagline'} lang={lang} aria-hidden="true">
        {starts.length ? inPhrases(chunks, starts) : chunks.map((chunk, i) => renderChunk(chunk, `${i}`))}
      </p>
    </>
  )
}
