import { useState } from 'react'
import { useCrt } from '@/crt/context'
import { SOUND_NAMES, type SoundName, type Variant } from '@/crt/Sound'

const VARIANTS: Variant[] = ['A', 'B', 'C']

export const SoundLab = () => {
  const crt = useCrt()
  const [picks, setPicks] = useState(() => ({ ...crt.sound.variants }))
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  const pick = (name: SoundName, variant: Variant) => {
    if (!crt.sound.enabled) crt.sound.setEnabled(true)
    crt.sound.setVariant(name, variant)
    crt.sound.play(name, { variant })
    setPicks((current) => ({ ...current, [name]: variant }))
  }

  const copy = () => {
    navigator.clipboard
      ?.writeText(JSON.stringify(picks))
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  }

  return (
    <aside className="sfx-lab" aria-label="Sound lab">
      <button type="button" className="sfx-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        sfx {open ? '−' : '+'}
      </button>
      {open ? (
        <>
          <ul>
            {SOUND_NAMES.map((name) => (
              <li key={name}>
                <span>{name}</span>
                {VARIANTS.map((variant) => (
                  <button key={variant} type="button" aria-pressed={picks[name] === variant} onClick={() => pick(name, variant)}>
                    {variant}
                  </button>
                ))}
              </li>
            ))}
          </ul>
          <button type="button" className="sfx-copy" onClick={copy}>
            {copied ? 'copied' : 'copy picks'}
          </button>
        </>
      ) : null}
    </aside>
  )
}
