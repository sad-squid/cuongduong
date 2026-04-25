import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { Analytics } from '@vercel/analytics/react'
import { ThemeContextProvider } from '@/theme/ThemeContext'
import { router } from '@/router'
import '@/i18n'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeContextProvider>
      <RouterProvider router={router} />
      <Analytics />
    </ThemeContextProvider>
  </StrictMode>,
)
