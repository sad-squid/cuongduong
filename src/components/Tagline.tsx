import { useSyncExternalStore, type Ref } from 'react'
import type { TaglineStore } from '@/crt/TaglineStore'

type TaglineProps = { store: TaglineStore; text: string; lang: string; lit: boolean; ref: Ref<HTMLParagraphElement> }

export const Tagline = ({ store, text, lang, lit, ref }: TaglineProps) => {
  const chunks = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return (
    <>
      <p className="sr-only" lang={lang}>
        {text}
      </p>
      <p ref={ref} className={lit ? 'tagline lit' : 'tagline'} lang={lang} aria-hidden="true">
        {chunks.map((chunk, i) => {
          if (chunk.kind === 'plain') return chunk.text
          if (chunk.kind === 'beam')
            return (
              <span key={i} className="beam">
                {chunk.text}
              </span>
            )
          if (chunk.kind === 'glow')
            return (
              <span key={i} className={`glow-${chunk.level}`}>
                {chunk.text}
              </span>
            )
          return (
            <span key={i} className="slot">
              <span className="ghost">{chunk.text}</span>
              <span className="glyph">{chunk.glyph}</span>
            </span>
          )
        })}
      </p>
    </>
  )
}
