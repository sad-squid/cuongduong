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

export const lightCyber: ThemePalette = {
  bg: '#F5F2ED',
  surface: '#FFFFFF',
  coral: '#A93520',
  teal: '#12687A',
  rose: '#B5A494',
  roseText: '#6B5440',
  cream: '#1A1A1B',
  beige: '#49443D',
  warmCoral: '#A8392E',
  dustyRose: '#8D6354',
}

export const getPalette = (isDark: boolean): ThemePalette => {
  return isDark ? darkCyber : lightCyber
}
