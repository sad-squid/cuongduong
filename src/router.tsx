import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/Home'
import { AboutPage } from '@/pages/About'
import { WorkPage } from '@/pages/Work'
import { NotesPage } from '@/pages/Notes'
import { ColophonPage } from '@/pages/Colophon'
import { NotFoundPage } from '@/pages/NotFound'

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: NotFoundPage,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
})

const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/work',
  component: WorkPage,
})

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes',
  component: NotesPage,
})

const colophonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/colophon',
  component: ColophonPage,
})

const routeTree = rootRoute.addChildren([homeRoute, aboutRoute, workRoute, notesRoute, colophonRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
