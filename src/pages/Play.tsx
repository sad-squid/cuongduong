import { lazy, Suspense, useCallback, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { useDocumentTitle } from '@/crt/useDocumentTitle'

const Arcade = lazy(() => import('@/components/Arcade').then((m) => ({ default: m.Arcade })))

export const Play = () => {
  const crt = useCrt()
  const { t } = useTranslation()
  const navigate = useNavigate()
  useDocumentTitle(t('play.title'))

  useEffect(() => {
    crt.stopFireworks()
    const start = window.setTimeout(() => crt.setGame(true))
    return () => {
      window.clearTimeout(start)
      crt.setGame(false)
    }
  }, [crt])

  const exit = useCallback(() => {
    void navigate({ to: '/' })
  }, [navigate])

  return (
    <>
      <h1 className="sr-only">{t('play.title')}</h1>
      <Suspense fallback={null}>
        <Arcade onExit={exit} />
      </Suspense>
    </>
  )
}
