import { Box, Container, Typography } from '@mui/material'
import { useColors } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

export function BlogPage() {
  const c = useColors()
  const { t } = useTranslation()
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Box sx={{ mb: { xs: 4, md: 5 } }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', display: 'block', mb: 2 }}
          >
            {t('blog.overline')}
          </Typography>
          <Typography variant="h2" sx={{ mb: 0 }}>
            {t('blog.title')}
          </Typography>
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.5,
            p: { xs: 4, md: 5 },
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: `${c.coral}33` },
          }}
        >
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            {t('blog.stub')}
          </Typography>
        </Box>
      </Box>
    </Container>
  )
}
