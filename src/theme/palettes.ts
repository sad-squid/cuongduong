export type ThemePalette = {
  bg: string
  surface: string
  coral: string
  teal: string
  rose: string
  roseText: string
  cream: string
  beige: string
  warmCoral: string
  dustyRose: string
}

// "Night edition" — warm ink on near-black paper
export const darkCyber: ThemePalette = {
  bg: '#1B1916',
  surface: '#242019',
  coral: '#E8603C',
  teal: '#6FA3C7',
  rose: '#52483B',
  roseText: '#B59B7F',
  cream: '#EFE9DC',
  beige: '#C9C0AE',
  warmCoral: '#E07856',
  dustyRose: '#A98B72',
}

// "Paper edition" — vermillion + stamp blue ink on warm paper (default)
export const lightCyber: ThemePalette = {
  bg: '#F6F1E7',
  surface: '#FCF8F0',
  coral: '#B33A1E',
  teal: '#1F5F8B',
  rose: '#C2B7A3',
  roseText: '#6B5440',
  cream: '#211D17',
  beige: '#5A5244',
  warmCoral: '#A8392E',
  dustyRose: '#8D6354',
}

export const getPalette = (isDark: boolean): ThemePalette => {
  return isDark ? darkCyber : lightCyber
}
