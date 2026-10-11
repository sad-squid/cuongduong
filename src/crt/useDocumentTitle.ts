import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toLanguage } from '@/i18n'
import SEO from '@/content/seo.json'
import { useSection } from '@/app/section'

type SeoPage = keyof typeof SEO.pages.en

export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    document.title = `${title} · Cuong Duong`
  }, [title])
}

export const usePageTitle = (page: SeoPage) => {
  const { i18n } = useTranslation()
  const { active } = useSection()
  const title = SEO.pages[toLanguage(i18n.resolvedLanguage)][page].title
  useEffect(() => {
    if (active) document.title = title
  }, [title, active])
}
