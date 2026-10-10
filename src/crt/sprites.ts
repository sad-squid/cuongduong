import { CHIIKAWA, CREEPER, CREWMATE, DOGE, GIGACHAD, HACHIWARE, INVADER, KIRBY, LEAF, NYAN, PEPE, PIKACHU, SQUIDWARD, TROLL, USAGI } from './spriteArt'

export type GridSprite = { name: string; palette: string[]; grid: string[]; crisp?: boolean }

export const SPRITES: GridSprite[] = [CHIIKAWA, HACHIWARE, USAGI, PIKACHU, SQUIDWARD, KIRBY, PEPE, DOGE, CREWMATE, GIGACHAD, TROLL, CREEPER, INVADER, NYAN, LEAF]
