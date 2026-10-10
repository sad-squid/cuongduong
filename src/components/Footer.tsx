import { useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { LINKS, SITE_LANGS, toSiteLang, type SiteLang } from '@/content/names'
import { ExternalDoor, RouteDoor } from './Doors'
import { useScramble } from './useScramble'

const LANG_LABELS: Record<SiteLang, string> = { en: 'EN', ja: '日本語', vi: 'Tiếng Việt' }

const LangButton = ({ code, current }: { code: SiteLang; current: boolean }) => {
  const crt = useCrt()
  const { i18n } = useTranslation()
  const label = LANG_LABELS[code]
  const [text, trigger] = useScramble(label, crt.reduceMotion)
  return (
    <button
      type="button"
      lang={code}
      className={current ? 'on' : undefined}
      aria-label={label}
      aria-pressed={current}
      onPointerEnter={trigger}
      onFocus={trigger}
      onClick={() => i18n.changeLanguage(code)}
    >
      {text}
    </button>
  )
}

export const Footer = () => {
  const { t, i18n } = useTranslation()
  const lang = toSiteLang(i18n.resolvedLanguage)
  const path = useRouterState({ select: (s) => s.location.pathname })

  return (
    <footer className="footer">
      {path === '/' ? (
        <nav className="doors" aria-label={t('footer.pages')}>
          <RouteDoor label={t('footer.about')} to="/about" />
          <RouteDoor label={t('footer.work')} to="/work" />
        </nav>
      ) : null}
      <nav className="doors" aria-label={t('footer.elsewhere')}>
        <ExternalDoor label="github" name="GitHub" href={LINKS.github} />
        <ExternalDoor label="linkedin" name="LinkedIn" href={LINKS.linkedin} />
      </nav>
      <div className="langs" role="group" aria-label={t('footer.language')}>
        {SITE_LANGS.map((code) => (
          <LangButton key={code} code={code} current={code === lang} />
        ))}
      </div>
    </footer>
  )
}
