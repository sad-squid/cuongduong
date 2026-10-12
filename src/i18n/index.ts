import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import vi from './locales/vi.json'
import ja from './locales/ja.json'

export const SUPPORTED_LANGUAGES = ['en', 'ja', 'vi'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_META: Record<Language, { name: string }> = {
  en: { name: 'English' },
  ja: { name: '日本語' },
  vi: { name: 'Tiếng Việt' },
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

const LANG_KEY = 'cd-lang'

export const rememberLanguage = (lang: Language) => {
  try {
    window.localStorage.setItem(LANG_KEY, lang)
  } catch {
    return
  }
}

const browserLanguage = (): Language | null => {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.split('-')[0]
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(base)) return base as Language
  }
  return null
}

const firstVisitLanguage = (): Language => {
  const fromPath = languageFromPath(window.location.pathname)
  try {
    if (window.localStorage.getItem(LANG_KEY) !== null || fromPath !== 'en' || navigator.webdriver) return fromPath
    const preferred = browserLanguage() ?? 'en'
    rememberLanguage(preferred)
    if (preferred === 'en') return fromPath
    const { pathname, search, hash } = window.location
    window.history.replaceState(window.history.state, '', `${withLanguage(pathname, preferred)}${search}${hash}`)
    return preferred
  } catch {
    return fromPath
  }
}

i18n
  .use(initReactI18next)
  .init({
    lng: firstVisitLanguage(),
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
