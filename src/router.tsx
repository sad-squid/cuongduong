import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/Home'
import { AboutPage } from '@/pages/About'
import { WorkPage } from '@/pages/Work'
import { NotesPage } from '@/pages/Notes'
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

// /blog shipped publicly before the rebuild; keep old links alive
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
