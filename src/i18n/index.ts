import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import vi from './locales/vi.json'
import ja from './locales/ja.json'

export const SUPPORTED_LANGUAGES = ['en', 'vi', 'ja'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_META: Record<Language, { code: string; name: string }> = {
  en: { code: 'EN', name: 'English' },
  vi: { code: 'VI', name: 'Tiếng Việt' },
  ja: { code: 'JA', name: '日本語' },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      ja: { translation: ja },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng.split('-')[0]
}

syncHtmlLang(i18n.resolvedLanguage ?? i18n.language)
i18n.on('languageChanged', syncHtmlLang)

export default i18n
