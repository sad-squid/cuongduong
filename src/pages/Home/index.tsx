import { useThemeToggle } from '@/theme/ThemeContext'
import { HomeNight } from './HomeNight'
import { HomePaper } from './HomePaper'

// Two editions, two layouts: the night edition keeps the handcrafted cyber
// bento; the paper edition sets the same content as a type specimen broadsheet.
export function HomePage() {
  const { isDark } = useThemeToggle()
  return isDark ? <HomeNight /> : <HomePaper />
}
