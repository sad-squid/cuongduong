export type Formation = 'grid' | 'minis' | 'swarm' | 'snake' | 'boss' | 'tanks' | 'ring' | 'rain' | 'chonk'

export type BossKind = 'face' | 'toaster' | 'duck'

export type Pattern = 'drop' | 'aimed' | 'fan' | 'bounce' | 'ring' | 'spiral' | 'burst'

export type WavePlan = { wave: number; formation: Formation; boss: BossKind | null; scale: number; hp: number; count: number }

const OPENING: Formation[] = ['grid', 'minis', 'swarm', 'snake', 'boss', 'tanks', 'ring', 'rain', 'chonk']
const LATER: Formation[] = ['swarm', 'snake', 'tanks', 'ring', 'rain', 'chonk', 'grid', 'minis']
const BOSSES: BossKind[] = ['face', 'toaster', 'duck']

const SCALE: Record<Formation, number> = { grid: 1, minis: 0.7, swarm: 0.42, snake: 0.85, boss: 4.4, tanks: 2.5, ring: 1.05, rain: 1, chonk: 1.6 }

const COUNT: Record<Formation, number> = { grid: 18, minis: 28, swarm: 60, snake: 16, boss: 1, tanks: 3, ring: 14, rain: 26, chonk: 8 }

const HP: Record<Formation, number> = { grid: 1, minis: 1, swarm: 1, snake: 1, boss: 70, tanks: 16, ring: 2, rain: 1, chonk: 3 }

export const planWave = (wave: number): WavePlan => {
  const n = Math.max(1, Math.floor(wave))
  const isBoss = n % 5 === 0
  const formation: Formation = isBoss ? 'boss' : n <= OPENING.length ? OPENING[n - 1] : LATER[(n * 3) % LATER.length]
  const late = Math.max(0, n - 9)
  const grow = Math.min(1.6, 1 + late * 0.06)
  const toughen = Math.floor((n - 1) / 6)
  const boss = isBoss ? BOSSES[(n / 5 - 1) % BOSSES.length] : null
  const hp = formation === 'boss' ? HP.boss + 30 * (n / 5 - 1) : formation === 'tanks' ? HP.tanks + 3 * n : HP[formation] + (HP[formation] > 1 ? toughen : Math.floor(toughen / 2))
  return { wave: n, formation, boss, scale: SCALE[formation], hp, count: Math.round(COUNT[formation] * (formation === 'boss' || formation === 'tanks' ? 1 : grow)) }
}


export const patternsFor = (wave: number): Pattern[] => {
  if (wave <= 2) return ['drop']
  if (wave <= 4) return ['drop', 'aimed', 'fan']
  if (wave <= 7) return ['aimed', 'fan', 'bounce', 'ring', 'drop']
  return ['aimed', 'fan', 'bounce', 'ring', 'spiral', 'burst']
}

export const volleyRate = (wave: number) => (wave <= 2 ? 0.75 + 0.2 * (wave - 1) : Math.min(4.2, 0.9 + 0.36 * wave))

export const bulletCap = (wave: number) => (wave <= 2 ? 3 + wave : Math.min(320, 10 + wave * wave * 4))

export const shieldHits = (wave: number) => Math.min(6, 1 + Math.floor(Math.max(1, wave) / 3))

export const shieldMs = (wave: number) => Math.min(25000, 14000 + 1000 * wave)

export const enrageCap = (wave: number) => (wave <= 3 ? 1 : wave <= 6 ? 2 : wave <= 9 ? 3 : 4)

export const enrageGap = (wave: number) => Math.max(2.2, 11 - wave * 0.85)
