export const NAMES = {
  en: { text: 'Cuong', lang: 'en', note: 'given name' },
  vi: { text: 'Cường', lang: 'vi', note: 'the same name in Vietnamese' },
  ja: { text: 'コン', lang: 'ja', note: 'the name in Japanese katakana' },
  zh: { text: '志強', lang: 'zh', note: '志 zhì is Trí, the middle name; 強 qiáng is Cường' },
} as const

export const NAME_ORDER = ['en', 'vi', 'ja', 'zh'] as const

export type NameKey = (typeof NAME_ORDER)[number]

export const LINKS = {
  github: 'https://github.com/sad-squid/',
  linkedin: 'https://linkedin.com/in/cuongduong-dev/',
} as const
