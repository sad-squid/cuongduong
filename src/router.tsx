import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { Layout } from '@/app/Layout'
import { Home } from '@/pages/Home'
import { About } from '@/pages/About'
import { Work } from '@/pages/Work'
import { Notes } from '@/pages/Notes'
import { NotFound } from '@/pages/NotFound'

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

export const router = createRouter({ routeTree, defaultViewTransition: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
