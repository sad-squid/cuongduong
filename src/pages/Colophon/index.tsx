import { Box, Container, Typography } from '@mui/material'
import { Link } from '@tanstack/react-router'
import { FRAUNCES, SPACE_MONO } from '@/theme'
import { cellEntrance } from '@/theme/animations'
import { useColors } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { Folio, Rule } from '@/components/ui/PrintMarks'
import { REVISION, EDITIONS, INKS } from '@/data/site'

const FACES = [
  { name: 'fraunces', descKey: 'colophon.typeFraunces', fontFamily: FRAUNCES, sample: 'cường dương 楊志強' },
  { name: 'dm sans', descKey: 'colophon.typeDm', fontFamily: '"DM Sans", sans-serif', sample: 'say something, do something' },
  { name: 'space mono', descKey: 'colophon.typeMono', fontFamily: SPACE_MONO, sample: '/kɔŋ/ · /tɹi/ · /dɔŋ/' },
] as const

const BUILD_KEYS = ['colophon.build1', 'colophon.build2', 'colophon.build3', 'colophon.build4', 'colophon.build5'] as const

type SectionProps = {
  header: string
  delay?: number
  children: React.ReactNode
}

const Section = ({ header, delay = 0, children }: SectionProps) => (
  <Box sx={{ mb: { xs: 5, md: 6 }, ...cellEntrance(delay) }}>
    <Typography
      variant="overline"
      sx={{ color: 'primary.main', display: 'block', mb: 2 }}
    >
      {header}
    </Typography>
    {children}
  </Box>
)

export function ColophonPage() {
  const c = useColors()
  const { t } = useTranslation()

  return (
    <Container maxWidth="md">
      <Box sx={{ py: { xs: 6, md: 8 }, position: 'relative' }}>
        {/* Header */}
        <Box sx={{ mb: { xs: 5, md: 6 }, ...cellEntrance(0) }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', display: 'block', mb: 2 }}
          >
            {t('colophon.overline')}
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4rem' },
              lineHeight: 1.1,
              mb: 1.5,
            }}
          >
            {t('colophon.title')}
          </Typography>
          <Typography
            sx={{
              fontFamily: SPACE_MONO,
              fontSize: { xs: '0.85rem', md: '0.95rem' },
              color: 'text.secondary',
            }}
          >
            {t('colophon.subtitle')}
          </Typography>
        </Box>

        {/* Edition history */}
        <Section header={t('colophon.editionsHeader')} delay={100}>
          {EDITIONS.map(({ rev, descKey }) => {
            const current = rev === REVISION
            return (
              <Box
                key={rev}
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: { xs: 1.5, md: 2.5 },
                  py: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:first-of-type': { borderTop: '1px solid', borderTopColor: 'divider' },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SPACE_MONO,
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: current ? c.coral : 'text.secondary',
                    opacity: current ? 1 : 0.6,
                    flexShrink: 0,
                    width: 64,
                  }}
                >
                  {rev}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.9rem',
                    color: current ? 'text.primary' : 'text.secondary',
                    lineHeight: 1.7,
                  }}
                >
                  {t(descKey)}
                </Typography>
              </Box>
            )
          })}
        </Section>

        {/* Design */}
        <Section header={t('colophon.designHeader')} delay={200}>
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, maxWidth: '36em', mb: 3 }}>
            {t('colophon.designBody')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 3 } }}>
            {INKS.map(({ nameKey, hex }) => (
              <Box key={nameKey} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 22,
                    height: 22,
                    backgroundColor: hex,
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography sx={{ fontFamily: SPACE_MONO, fontSize: '0.7rem', color: 'text.primary', lineHeight: 1.4 }}>
                    {t(nameKey)}
                  </Typography>
                  <Typography sx={{ fontFamily: SPACE_MONO, fontSize: '0.6rem', color: 'text.secondary', opacity: 0.6, lineHeight: 1.4 }}>
                    {hex.toLowerCase()}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Section>

        {/* Type specimen */}
        <Section header={t('colophon.typeHeader')} delay={300}>
          {FACES.map(({ name, descKey, fontFamily, sample }) => (
            <Box
              key={name}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: { xs: 1, md: 2.5 },
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:first-of-type': { borderTop: '1px solid', borderTopColor: 'divider' },
              }}
            >
              <Box sx={{ width: { xs: '100%', sm: 200 }, flexShrink: 0 }}>
                <Typography sx={{ fontFamily: SPACE_MONO, fontSize: '0.75rem', color: 'text.primary' }}>
                  {name}
                </Typography>
                <Typography sx={{ fontFamily: SPACE_MONO, fontSize: '0.65rem', color: 'text.secondary', opacity: 0.7 }}>
                  {t(descKey)}
                </Typography>
              </Box>
              <Typography sx={{ fontFamily, fontSize: { xs: '1.1rem', md: '1.35rem' }, color: 'text.primary', lineHeight: 1.4 }}>
                {sample}
              </Typography>
            </Box>
          ))}
        </Section>

        {/* Build notes */}
        <Section header={t('colophon.buildHeader')} delay={400}>
          {BUILD_KEYS.map((key, i) => (
            <Typography
              key={key}
              sx={{
                fontFamily: SPACE_MONO,
                fontSize: '0.75rem',
                color: 'text.secondary',
                lineHeight: 2,
              }}
            >
              <Box component="span" aria-hidden="true" sx={{ color: c.coral, mr: 1, opacity: 0.7 }}>
                {String(i + 1).padStart(2, '0')}
              </Box>
              {t(key)}
            </Typography>
          ))}
        </Section>

        {/* In development */}
        <Section header={t('colophon.devHeader')} delay={500}>
          <Typography sx={{ fontFamily: SPACE_MONO, fontSize: '0.75rem', color: 'text.secondary', lineHeight: 2 }}>
            {t('colophon.devPhotos')}
          </Typography>
          <Typography
            component={Link}
            to="/notes"
            sx={{
              fontFamily: SPACE_MONO,
              fontSize: '0.75rem',
              color: 'text.secondary',
              lineHeight: 2,
              display: 'inline-block',
              textDecoration: 'underline',
              textDecorationColor: 'transparent',
              textUnderlineOffset: 3,
              transition: 'color 0.15s, text-decoration-color 0.15s',
              '&:hover': { color: c.coral, textDecorationColor: c.coral },
            }}
          >
            {t('colophon.devNotes')} →
          </Typography>
        </Section>

        <Box sx={{ ...cellEntrance(600) }}>
          <Rule color={c.cream} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Folio>{`CD—25 / ${REVISION}`}</Folio>
            <Typography sx={{ fontFamily: SPACE_MONO, fontSize: '0.65rem', color: 'text.secondary', opacity: 0.6 }}>
              — cd · tokyo
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  )
}
