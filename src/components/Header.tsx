import { useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { RouteDoor } from './Doors'

export const Header = () => {
  const { t } = useTranslation()
  const path = useRouterState({ select: (s) => s.location.pathname })

  return path === '/' ? null : (
    <header className="topbar">
      <RouteDoor label="cuong" name={t('header.home')} to="/" />
      <nav className="doors" aria-label={t('footer.pages')}>
        <RouteDoor label={t('footer.about')} to="/about" />
        <RouteDoor label={t('footer.work')} to="/work" />
      </nav>
    </header>
  )
}
