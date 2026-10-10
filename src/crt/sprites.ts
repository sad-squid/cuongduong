import { CHIIKAWA, CREWMATE, DOGE, GIGACHAD, HACHIWARE, KIRBY, PEPE, PIKACHU, SQUIDWARD, TROLL, USAGI } from './spriteArt'

export type GridSprite = { name: string; palette: string[]; grid: string[] }

export const SPRITES: GridSprite[] = [CHIIKAWA, HACHIWARE, USAGI, PIKACHU, SQUIDWARD, KIRBY, PEPE, DOGE, CREWMATE, GIGACHAD, TROLL]
