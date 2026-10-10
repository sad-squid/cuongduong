import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DotIcon } from './DotIcon'

const FIRST_MS = 1800
const IDLE_MS = 6000
const TOP = 8

export const ScrollHint = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let timer = 0
    const wait = (ms: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (window.scrollY < TOP) setShown(true)
      }, ms)
    }
    const onScroll = () => {
      if (window.scrollY > TOP) setShown(false)
      wait(IDLE_MS)
    }
    const onTouch = () => wait(IDLE_MS)
    wait(FIRST_MS)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', onTouch, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointerdown', onTouch)
    }
  }, [])

  return (
    <button
      type="button"
      className={shown ? 'scroll-hint on' : 'scroll-hint'}
      aria-label={t('footer.scrollTo', { page: t('footer.about') })}
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      onClick={() => {
        setShown(false)
        onClick()
      }}
    >
      <DotIcon icon="chevron" />
    </button>
  )
}
