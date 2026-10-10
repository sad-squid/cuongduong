export const NAMES = {
  en: { text: 'Cuong', lang: 'en' },
  vi: { text: 'Cường', lang: 'vi' },
  ja: { text: 'コン', lang: 'ja' },
  zh: { text: '志強', lang: 'zh' },
} as const

export const NAME_ORDER = ['en', 'vi', 'ja', 'zh'] as const

export type NameKey = (typeof NAME_ORDER)[number]

export const LINKS = {
  github: 'https://github.com/sad-squid/',
  linkedin: 'https://linkedin.com/in/cuongduong-dev/',
} as const
