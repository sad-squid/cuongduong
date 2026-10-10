import { useTranslation } from 'react-i18next'
import { LANGUAGE_META, SUPPORTED_LANGUAGES, toLanguage, type Language } from '@/i18n'
import { useCrt } from '@/crt/context'
import { LINKS } from '@/content/names'
import { IconDoor, RouteDoor } from './Doors'
import { useScramble } from './useScramble'

const LangButton = ({ code, current }: { code: Language; current: boolean }) => {
  const crt = useCrt()
  const { i18n } = useTranslation()
  const label = LANGUAGE_META[code].label
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
        {LANGUAGE_META[code].code}
      </span>
    </button>
  )
}

export const Footer = () => {
  const { t, i18n } = useTranslation()
  const lang = toLanguage(i18n.resolvedLanguage)

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
        {SUPPORTED_LANGUAGES.map((code) => (
          <LangButton key={code} code={code} current={code === lang} />
        ))}
      </div>
    </footer>
  )
}
