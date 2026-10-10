import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import vi from './locales/vi.json'
import ja from './locales/ja.json'

export const SUPPORTED_LANGUAGES = ['en', 'ja', 'vi'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_META: Record<Language, { code: string; label: string }> = {
  en: { code: 'EN', label: 'EN' },
  ja: { code: 'JA', label: '日本語' },
  vi: { code: 'VI', label: 'Tiếng Việt' },
}

export const toLanguage = (lng: string | undefined): Language => {
  const base = (lng ?? 'en').split('-')[0]
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base) ? (base as Language) : 'en'
}

export const languageFromPath = (pathname: string): Language => {
  const segment = pathname.split('/')[1]
  return segment === 'ja' || segment === 'vi' ? segment : 'en'
}

export const stripLanguage = (pathname: string) => {
  const lang = languageFromPath(pathname)
  return lang === 'en' ? pathname : pathname.slice(lang.length + 1) || '/'
}

export const withLanguage = (pathname: string, lang: Language) => (lang === 'en' ? pathname : `/${lang}${pathname === '/' ? '' : pathname}`)

i18n
  .use(initReactI18next)
  .init({
    lng: languageFromPath(window.location.pathname),
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      ja: { translation: ja },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
  })

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng.split('-')[0]
}

syncHtmlLang(i18n.resolvedLanguage ?? i18n.language)
i18n.on('languageChanged', syncHtmlLang)

export default i18n
