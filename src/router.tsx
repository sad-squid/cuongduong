import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { Layout } from '@/app/Layout'
import { Home } from '@/pages/Home'
import { About } from '@/pages/About'
import { Work } from '@/pages/Work'
import { Notes } from '@/pages/Notes'
import { NotFound } from '@/pages/NotFound'
import i18n, { languageFromPath, stripLanguage, toLanguage, withLanguage, type Language } from '@/i18n'

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: NotFound,
})

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home })
const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/about', component: About })
const workRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work', component: Work })
const notesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notes', component: Notes })

const blogRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/blog',
  beforeLoad: () => {
    throw redirect({ to: '/notes' })
  },
})

const routeTree = rootRoute.addChildren([homeRoute, aboutRoute, workRoute, notesRoute, blogRedirectRoute])

export const router = createRouter({
  routeTree,
  rewrite: {
    input: ({ url }) => {
      url.pathname = stripLanguage(url.pathname)
      return url
    },
    output: ({ url }) => {
      url.pathname = withLanguage(url.pathname, toLanguage(i18n.resolvedLanguage))
      return url
    },
  },
})

export const setLanguage = async (lang: Language) => {
  if (toLanguage(i18n.resolvedLanguage) === lang) return
  const { pathname, searchStr, hash } = router.state.location
  await i18n.changeLanguage(lang)
  router.history.push(`${withLanguage(pathname, lang)}${searchStr}${hash ? `#${hash}` : ''}`)
}

window.addEventListener('popstate', () => {
  const lang = languageFromPath(window.location.pathname)
  if (toLanguage(i18n.resolvedLanguage) !== lang) i18n.changeLanguage(lang)
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
