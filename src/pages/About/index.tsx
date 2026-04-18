import { Box, Container, Typography, Stack } from '@mui/material'
import { GlitchText } from '@/components/ui/GlitchText'
import { SPACE_GROTESK, SPACE_MONO } from '@/theme'
import { cellEntrance } from '@/theme/animations'
import { useColors } from '@/theme/ThemeContext'
import { Trans, useTranslation } from 'react-i18next'

type SectionProps = {
  header: string
  delay?: number
  children: React.ReactNode
}

const Section = ({ header, delay = 0, children }: SectionProps) => (
  <Box sx={{ mb: { xs: 5, md: 7 }, ...cellEntrance(delay) }}>
    <Typography
      variant="overline"
      sx={{ color: 'primary.main', display: 'block', mb: 2 }}
    >
      {header}
    </Typography>
    {children}
  </Box>
)

export function AboutPage() {
  const c = useColors()
  const { t } = useTranslation()

  const skills: Array<[string, string, string]> = [
    [t('about.skillsFrontend'), t('about.skillsFrontendItems'), 'SPK'],
    [t('about.skillsA11y'), t('about.skillsA11yItems'), 'A11'],
    [t('about.skillsAi'), t('about.skillsAiItems'), 'MTR'],
    [t('about.skillsDs'), t('about.skillsDsItems'), 'DSY'],
    [t('about.skillsCrab'), t('about.skillsCrabItems'), 'CRB'],
    [t('about.skillsCoffee'), t('about.skillsCoffeeItems'), 'BRW'],
  ]

  const awards = [t('about.award1'), t('about.award2')]

  const langs: Array<{ code: string; text: string; bg: string }> = [
    { code: 'EN', text: t('about.langEn'), bg: c.coral },
    { code: 'VI', text: t('about.langVi'), bg: c.teal },
    { code: 'JA', text: t('about.langJa'), bg: c.roseText },
    { code: 'ZH', text: t('about.langZh'), bg: c.warmCoral },
    { code: 'KO', text: t('about.langKr'), bg: c.dustyRose },
    { code: 'FR', text: t('about.langFr'), bg: c.rose },
  ]

  return (
    <Container maxWidth="md">
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        {/* Header */}
        <Box sx={{ mb: { xs: 5, md: 7 } }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', display: 'block', mb: 2 }}
          >
            {t('about.overline')}
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontFamily: SPACE_GROTESK,
              fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4rem' },
              lineHeight: 1.1,
              cursor: 'default',
            }}
          >
            <GlitchText
              type="hover"
              hoverTexts={['強', 'cường', 'コン']}
            >
              {t('about.title')}
            </GlitchText>
          </Typography>
          <Typography
            sx={{
              mt: 2,
              fontFamily: SPACE_MONO,
              fontSize: { xs: '0.85rem', md: '0.95rem' },
              color: 'text.secondary',
            }}
          >
            <GlitchText type="hover" sticky hoverTexts={[t('about.subtitleAlt')]} intensity={0.6}>
              {t('about.subtitle')}
            </GlitchText>
          </Typography>
        </Box>

        {/* Name + pronunciation */}
        <Section header={t('about.nameHeader')} delay={0}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {[
              {
                label: 'EN',
                native: 'ENGLISH',
                val: t('about.nameEn'),
                accent: c.coral,
                pronounce: t('about.pronounceEn'),
              },
              {
                label: 'VI',
                native: 'TIẾNG VIỆT',
                val: t('about.nameVi'),
                accent: c.teal,
                pronounce: t('about.pronounceVi'),
              },
              {
                label: 'ZH · JA',
                native: '中文・日本語',
                val: t('about.nameZh'),
                accent: c.roseText,
                pronounce: t('about.pronounceZh'),
              },
            ].map(({ label, native, val, accent, pronounce }) => (
              <Box
                key={label}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderTop: '3px solid',
                  borderTopColor: accent,
                  p: { xs: 2, md: 2.5 },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: `${accent}66`, borderTopColor: accent },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: SPACE_GROTESK,
                    fontSize: { xs: '1.35rem', md: '1.55rem' },
                    lineHeight: 1.15,
                    color: 'text.primary',
                    textTransform: 'lowercase',
                  }}
                >
                  {val}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SPACE_MONO,
                    fontSize: '0.65rem',
                    letterSpacing: '0.15em',
                    color: accent,
                  }}
                >
                  {label} · {native}
                </Typography>
                {pronounce ? (
                  <Typography
                    sx={{
                      fontFamily: SPACE_MONO,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      opacity: 0.7,
                      mt: 0.5,
                    }}
                  >
                    ↳ {pronounce}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Box>
        </Section>

        {/* Blurb */}
        <Section header={t('about.blurbHeader')} delay={100}>
          <Box
            sx={{
              position: 'relative',
              borderLeft: '3px solid',
              borderLeftColor: c.coral,
              backgroundColor: `${c.coral}08`,
              p: { xs: 3, md: 4 },
              '&::before, &::after, & > .corner-bl, & > .corner-br': {
                content: '""',
                position: 'absolute',
                width: 10,
                height: 10,
                borderColor: c.coral,
                borderStyle: 'solid',
              },
              '&::before': { top: -1, left: -3, borderWidth: '1px 0 0 3px' },
              '&::after': { top: -1, right: -1, borderWidth: '1px 1px 0 0' },
              '& > .corner-bl': { bottom: -1, left: -3, borderWidth: '0 0 1px 3px' },
              '& > .corner-br': { bottom: -1, right: -1, borderWidth: '0 1px 1px 0' },
            }}
          >
            <Box className="corner-bl" />
            <Box className="corner-br" />
            <Typography
              sx={{
                fontFamily: SPACE_MONO,
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                color: c.coral,
                opacity: 0.6,
                mb: 1.5,
              }}
            >
              B.01
            </Typography>
            <Typography
              sx={{
                fontFamily: SPACE_GROTESK,
                fontSize: { xs: '1.25rem', md: '1.4rem' },
                color: 'text.primary',
                fontStyle: 'italic',
                lineHeight: 1.4,
                mb: 2,
              }}
            >
              {t('about.introOpener')}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.05rem' },
                color: 'text.secondary',
                lineHeight: 1.8,
                '& a': { color: 'primary.main', textDecoration: 'underline' },
              }}
            >
              <Trans
                i18nKey="about.intro"
                components={{
                  1: (
                    <Box
                      component="a"
                      href="https://linkedin.com/in/cuongduong-dev/"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              />
            </Typography>
            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: '1px dashed',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: SPACE_MONO,
                fontSize: '0.7rem',
                color: 'text.secondary',
                opacity: 0.7,
              }}
            >
              <Box component="span">— cd</Box>
              <Box component="span">
                {new Date().getFullYear()} · tokyo
              </Box>
            </Box>
          </Box>
        </Section>

        {/* Skills */}
        <Section header={t('about.skillsHeader')} delay={200}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' },
              gap: 2,
            }}
          >
            {skills.map(([label, items, tag], i) => {
              const accents = [c.coral, c.teal, c.roseText, c.warmCoral, c.dustyRose, c.rose]
              const spans = [3, 3, 2, 2, 2, 6]
              const variants = ['border', 'bar', 'tint', 'border', 'bar', 'tint'] as const
              const accent = accents[i]
              const variant = variants[i]
              const code = `SK.${tag}`

              const variantSx =
                variant === 'bar'
                  ? { borderLeft: '3px solid', borderLeftColor: accent, pl: 2.5 }
                  : variant === 'tint'
                    ? { backgroundColor: `${accent}12`, p: 2.5 }
                    : { border: '1px solid', borderColor: 'divider', p: 2.5 }

              return (
                <Box
                  key={label}
                  sx={{
                    gridColumn: { xs: '1 / -1', md: `span ${spans[i]}` },
                    py: variant === 'bar' ? 2 : undefined,
                    transition: 'all 0.2s',
                    '&:hover':
                      variant === 'border'
                        ? { borderColor: `${accent}88` }
                        : variant === 'tint'
                          ? { backgroundColor: `${accent}22` }
                          : { borderLeftWidth: 6, pl: 'calc(1.25rem - 3px)' },
                    ...variantSx,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: SPACE_MONO,
                        fontSize: '0.6rem',
                        letterSpacing: '0.15em',
                        color: accent,
                        opacity: 0.6,
                      }}
                    >
                      {code}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: SPACE_MONO,
                        fontSize: '0.7rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        color: accent,
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.9rem',
                      color: 'text.secondary',
                      lineHeight: 1.6,
                    }}
                  >
                    {items}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Section>

        {/* Awards */}
        <Section header={t('about.awardsHeader')} delay={300}>
          <Stack spacing={1.25}>
            {awards.map((a, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1,
                  borderBottom: i < awards.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 8,
                    height: 8,
                    backgroundColor: c.coral,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: SPACE_MONO,
                    fontSize: '0.85rem',
                    color: 'text.primary',
                  }}
                >
                  {a}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Section>

        {/* Languages */}
        <Section header={t('about.langsHeader')} delay={400}>
          <Stack spacing={1}>
            {langs.map(({ code, text, bg }) => (
              <Box
                key={code}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1,
                }}
              >
                <Box
                  sx={{
                    backgroundColor: bg,
                    color: c.bg,
                    fontFamily: SPACE_MONO,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    px: 1,
                    py: 0.5,
                    minWidth: 32,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {code}
                </Box>
                <Typography
                  sx={{
                    fontFamily: SPACE_MONO,
                    fontSize: '0.85rem',
                    color: 'text.secondary',
                  }}
                >
                  {text}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Section>
      </Box>
    </Container>
  )
}
