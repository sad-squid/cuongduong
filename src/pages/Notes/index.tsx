import { Box, Container, Typography } from '@mui/material'
import { cellEntrance } from '@/theme/animations'
import { useColors } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { Folio } from '@/components/ui/PrintMarks'

export function NotesPage() {
  const c = useColors()
  const { t } = useTranslation()
  return (
    <Container maxWidth="md">
      <Box sx={{ py: { xs: 6, md: 8 }, position: 'relative' }}>
        <Box sx={{ mb: { xs: 4, md: 5 }, ...cellEntrance(0) }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', display: 'block', mb: 2 }}
          >
            {t('notes.overline')}
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4rem' },
              lineHeight: 1.1,
              mb: 0,
            }}
          >
            {t('notes.title')}
          </Typography>
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 4, md: 5 },
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: `${c.coral}33` },
            ...cellEntrance(100),
          }}
        >
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            {t('notes.stub')}
          </Typography>
        </Box>

        <Folio sx={{ mt: 6, display: 'block' }}>P.04 / Notes</Folio>
      </Box>
    </Container>
  )
}
