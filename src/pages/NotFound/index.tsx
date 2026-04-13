import { Box, Container, Typography, Stack } from '@mui/material'
import { Link } from '@tanstack/react-router'
import { GlitchText } from '@/components/ui/GlitchText'
import { SPACE_GROTESK, SPACE_MONO } from '@/theme'
import { useColors } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const c = useColors()
  const { t } = useTranslation()

  const links: Array<{ to: string; label: string }> = [
    { to: '/', label: t('nav.home') },
    { to: '/work', label: t('nav.work') },
    { to: '/about', label: t('nav.about') },
  ]

  return (
    <Container maxWidth="md">
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Typography
          variant="overline"
          sx={{ color: 'primary.main', display: 'block', mb: 2 }}
        >
          {t('notFound.overline')}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontFamily: SPACE_GROTESK,
            fontSize: { xs: '3.5rem', sm: '5rem', md: '7rem' },
            lineHeight: 1,
            mb: 3,
            cursor: 'default',
          }}
        >
          <GlitchText type="hover" hoverTexts={['???', '404', '迷子']}>
            404
          </GlitchText>
        </Typography>

        <Typography
          sx={{
            fontFamily: SPACE_MONO,
            fontSize: { xs: '0.9rem', md: '1rem' },
            color: 'text.secondary',
            mb: 5,
            maxWidth: 520,
            lineHeight: 1.7,
          }}
        >
          {t('notFound.body')}
        </Typography>

        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            pt: 3,
          }}
        >
          <Typography
            sx={{
              fontFamily: SPACE_MONO,
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              color: c.coral,
              opacity: 0.7,
              mb: 2,
            }}
          >
            {t('notFound.tryHeader')}
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            {links.map(({ to, label }) => (
              <Box
                key={to}
                component={Link}
                to={to}
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.85rem',
                  color: 'text.primary',
                  textDecoration: 'none',
                  borderBottom: '1px solid',
                  borderColor: 'transparent',
                  transition: 'border-color 0.2s, color 0.2s',
                  '&:hover': { borderColor: c.coral, color: c.coral },
                }}
              >
                ↳ {label}
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Container>
  )
}
