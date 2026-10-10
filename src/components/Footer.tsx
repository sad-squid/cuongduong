import { useTranslation } from 'react-i18next'
import { useCrt } from '@/crt/context'
import { LINKS, SITE_LANGS, toSiteLang, type SiteLang } from '@/content/names'
import { IconDoor, RouteDoor } from './Doors'
import { useScramble } from './useScramble'

const LANG_LABELS: Record<SiteLang, string> = { en: 'EN', ja: '日本語', vi: 'Tiếng Việt' }

const LANG_CODES: Record<SiteLang, string> = { en: 'EN', ja: 'JA', vi: 'VI' }

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
      <span className="label-long">{text}</span>
      <span className="label-short" aria-hidden="true">
        {LANG_CODES[code]}
      </span>
    </button>
  )
}

export const Footer = () => {
  const { t, i18n } = useTranslation()
  const lang = toSiteLang(i18n.resolvedLanguage)

  return (
    <footer className="footer">
      <nav className="doors" aria-label={t('footer.pages')}>
        <RouteDoor label={t('footer.home')} to="/" />
        <RouteDoor label={t('footer.about')} to="/about" />
        <RouteDoor label={t('footer.work')} to="/work" />
      </nav>
      <nav className="doors" aria-label={t('footer.elsewhere')}>
        <IconDoor icon="github" name="GitHub" href={LINKS.github} />
        <IconDoor icon="linkedin" name="LinkedIn" href={LINKS.linkedin} />
      </nav>
      <div className="langs" role="group" aria-label={t('footer.language')}>
        {SITE_LANGS.map((code) => (
          <LangButton key={code} code={code} current={code === lang} />
        ))}
      </div>
    </footer>
  )
}
