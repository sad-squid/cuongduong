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

// "Night edition" — the original handcrafted cyber zen: grey, pink, coral (default)
export const darkCyber: ThemePalette = {
  bg: '#1A1A1B',
  surface: '#262630',
  coral: '#FF5533',
  teal: '#3BB8D0',
  rose: '#864854',
  roseText: '#BA7F8A',
  cream: '#F0EEE9',
  beige: '#DCD7C9',
  warmCoral: '#F06E61',
  dustyRose: '#B58484',
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
