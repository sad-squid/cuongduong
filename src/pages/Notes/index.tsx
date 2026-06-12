import { Box, Container, Typography } from '@mui/material'
import { SPACE_MONO } from '@/theme'
import { cellEntrance } from '@/theme/animations'
import { useColors } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { Folio } from '@/components/ui/PrintMarks'

const PIECES = [
  { titleKey: 'notes.item1Title', descKey: 'notes.item1Desc', statusKey: 'notes.statusDrafting' },
  { titleKey: 'notes.item2Title', descKey: 'notes.item2Desc', statusKey: 'notes.statusInProof' },
  { titleKey: 'notes.item3Title', descKey: 'notes.item3Desc', statusKey: 'notes.statusDrafting' },
] as const

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
              mb: 2,
            }}
          >
            {t('notes.title')}
          </Typography>
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, maxWidth: '36em' }}>
            {t('notes.intro')}
          </Typography>
        </Box>

        <Box sx={{ ...cellEntrance(100) }}>
          {PIECES.map(({ titleKey, descKey, statusKey }, i) => (
            <Box
              key={titleKey}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: { xs: 1, md: 2 },
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:first-of-type': { borderTop: '1px solid', borderTopColor: 'divider' },
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  color: 'text.secondary',
                  opacity: 0.6,
                  flexShrink: 0,
                  width: 32,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <Typography
                  variant="h2"
                  sx={{ fontSize: { xs: '1.1rem', md: '1.3rem' }, lineHeight: 1.3, mb: 0.5 }}
                >
                  {t(titleKey)}
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', lineHeight: 1.7 }}>
                  {t(descKey)}
                </Typography>
              </Box>
              <Typography
                component="span"
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.6rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: c.coral,
                  border: `1px solid ${c.coral}55`,
                  px: 1,
                  py: 0.5,
                  flexShrink: 0,
                }}
              >
                {t(statusKey)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Folio sx={{ mt: 6, display: 'block' }}>P.04 / Notes</Folio>
      </Box>
    </Container>
  )
}
