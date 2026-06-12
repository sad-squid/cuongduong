import { Box, Container, Typography, Stack } from '@mui/material'
import { GlitchText } from '@/components/ui/GlitchText'
import { CropMarks } from '@/components/ui/PrintMarks'
import { FRAUNCES, SPACE_GROTESK, SPACE_MONO } from '@/theme'
import { cellEntrance } from '@/theme/animations'
import { useThemeToggle } from '@/theme/ThemeContext'
import { Trans, useTranslation } from 'react-i18next'
import { REVISION, EDITIONS, INKS } from '@/data/site'

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
  const { isDark, palette: c } = useThemeToggle()
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

  // night: colored tiles; paper: one ink fading with fluency
  const langs: Array<{ code: string; text: string; ink: number; tile: string }> = [
    { code: 'EN', text: t('about.langEn'), ink: 1, tile: c.coral },
    { code: 'VI', text: t('about.langVi'), ink: 1, tile: c.teal },
    { code: 'JA', text: t('about.langJa'), ink: 0.8, tile: c.roseText },
    { code: 'ZH', text: t('about.langZh'), ink: 0.6, tile: c.warmCoral },
    { code: 'KO', text: t('about.langKr'), ink: 0.45, tile: c.dustyRose },
    { code: 'FR', text: t('about.langFr'), ink: 0.3, tile: c.rose },
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
            }}
          >
            <CropMarks color={c.coral} size={10} opacity={1} />
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
              ¶ 01
            </Typography>
            <Typography
              sx={{
                fontFamily: FRAUNCES,
                fontSize: { xs: '1.25rem', md: '1.4rem' },
                color: 'text.primary',
                fontStyle: 'italic',
                fontWeight: 400,
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
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' },
              gap: 2,
            }}
          >
            {skills.map(([label, items, tag], i) => {
              const spans = [3, 3, 2, 2, 2, 6]
              const variants = ['border', 'bar', 'tint', 'border', 'bar', 'tint'] as const
              // night edition keeps the handcrafted six-accent set; paper prints one ink
              const accents = [c.coral, c.teal, c.roseText, c.warmCoral, c.dustyRose, c.rose]
              const accent = isDark ? accents[i] : c.coral
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
                    gridColumn: {
                      xs: '1 / -1',
                      sm: i === 5 ? '1 / -1' : 'span 1',
                      md: `span ${spans[i]}`,
                    },
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
            {langs.map(({ code, text, ink, tile }) => (
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
                    backgroundColor: isDark ? tile : c.cream,
                    opacity: isDark ? 1 : ink,
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

        {/* This site */}
        <Section header={t('site.siteHeader')} delay={500}>
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, maxWidth: '36em', mb: 2.5 }}>
            {t('site.siteBody')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 3 }, mb: 3.5 }}>
            {INKS.map(({ nameKey, hex }) => (
              <Box key={nameKey} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 18,
                    height: 18,
                    backgroundColor: hex,
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography sx={{ fontFamily: SPACE_MONO, fontSize: '0.65rem', color: 'text.primary', lineHeight: 1.4 }}>
                    {t(nameKey)}
                  </Typography>
                  <Typography sx={{ fontFamily: SPACE_MONO, fontSize: '0.55rem', color: 'text.secondary', opacity: 0.6, lineHeight: 1.4 }}>
                    {hex.toLowerCase()}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ mb: 3.5 }}>
            {EDITIONS.map(({ rev, descKey }) => {
              const current = rev === REVISION
              return (
                <Box
                  key={rev}
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: { xs: 1.5, md: 2.5 },
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:first-of-type': { borderTop: '1px solid', borderTopColor: 'divider' },
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: SPACE_MONO,
                      fontSize: '0.65rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: current ? c.coral : 'text.secondary',
                      opacity: current ? 1 : 0.6,
                      flexShrink: 0,
                      width: 56,
                    }}
                  >
                    {rev}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.85rem',
                      color: current ? 'text.primary' : 'text.secondary',
                      lineHeight: 1.7,
                    }}
                  >
                    {t(descKey)}
                  </Typography>
                </Box>
              )
            })}
          </Box>
          <Box>
            {['site.siteBuild1', 'site.siteBuild2', 'site.siteBuild3', 'site.siteBuild4', 'site.siteBuild5'].map((key, i) => (
              <Typography
                key={key}
                sx={{
                  fontFamily: SPACE_MONO,
                  fontSize: '0.72rem',
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
          </Box>
        </Section>
      </Box>
    </Container>
  )
}
