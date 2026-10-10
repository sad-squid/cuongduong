import { CHIIKAWA, HACHIWARE, KIRBY, PIKACHU, SQUIDWARD, USAGI } from './spriteArt'

export type GridSprite = {
  name: string
  palette: string[]
  grid: string[]
}

export type Sprite = {
  name: string
  w: number
  h: number
  palette: string[]
  draw: (c: CanvasRenderingContext2D) => void
}

export const HOLE = '#000000'

const ell = (c: CanvasRenderingContext2D, fill: string, x: number, y: number, rx: number, ry: number, rot = 0) => {
  c.fillStyle = fill
  c.beginPath()
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  c.fill()
}

const poly = (c: CanvasRenderingContext2D, fill: string, pts: number[]) => {
  c.fillStyle = fill
  c.beginPath()
  c.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1])
  c.closePath()
  c.fill()
}

const stroke = (c: CanvasRenderingContext2D, color: string, width: number, path: (c: CanvasRenderingContext2D) => void) => {
  c.strokeStyle = color
  c.lineWidth = width
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.beginPath()
  path(c)
  c.stroke()
}

export const SPRITES: (Sprite | GridSprite)[] = [
  PIKACHU,
  CHIIKAWA,
  HACHIWARE,
  USAGI,
  SQUIDWARD,
  KIRBY,
  {
    name: 'pepe',
    w: 110,
    h: 90,
    palette: ['#5FA052', '#F4F1EA', '#B5503E', '#3F7A38', HOLE],
    draw: (c) => {
      ell(c, '#5FA052', 55, 56, 50, 30)
      ell(c, '#5FA052', 34, 30, 22, 19)
      ell(c, '#5FA052', 76, 30, 22, 19)
      ell(c, '#F4F1EA', 34, 34, 16, 11)
      ell(c, '#F4F1EA', 76, 34, 16, 11)
      ell(c, HOLE, 42, 36, 6, 7)
      ell(c, HOLE, 84, 36, 6, 7)
      ell(c, '#5FA052', 34, 22, 20, 12)
      ell(c, '#5FA052', 76, 22, 20, 12)
      stroke(c, '#3F7A38', 2.5, (p) => {
        p.moveTo(16, 31)
        p.quadraticCurveTo(34, 26, 52, 31)
        p.moveTo(58, 31)
        p.quadraticCurveTo(76, 26, 94, 31)
      })
      ell(c, '#B5503E', 55, 70, 38, 8)
      stroke(c, HOLE, 2, (p) => {
        p.moveTo(20, 70)
        p.quadraticCurveTo(55, 66, 90, 70)
      })
    },
  },
  {
    name: 'doge',
    w: 100,
    h: 100,
    palette: ['#E3A857', '#F4E7CF', HOLE],
    draw: (c) => {
      poly(c, '#E3A857', [10, 50, 16, 4, 44, 30])
      poly(c, '#E3A857', [90, 50, 84, 4, 56, 30])
      poly(c, '#F4E7CF', [18, 40, 21, 16, 36, 31])
      poly(c, '#F4E7CF', [82, 40, 79, 16, 64, 31])
      ell(c, '#E3A857', 50, 60, 44, 36)
      ell(c, '#F4E7CF', 50, 78, 30, 18)
      ell(c, '#F4E7CF', 24, 70, 14, 12)
      ell(c, '#F4E7CF', 76, 70, 14, 12)
      ell(c, '#F4E7CF', 37, 44, 4, 2.5)
      ell(c, '#F4E7CF', 63, 44, 4, 2.5)
      ell(c, HOLE, 36, 54, 5.5, 4)
      ell(c, HOLE, 64, 54, 5.5, 4)
      ell(c, '#F4E7CF', 39, 54, 2.5, 2.8)
      ell(c, '#F4E7CF', 67, 54, 2.5, 2.8)
      ell(c, HOLE, 50, 68, 8, 5.5)
      stroke(c, HOLE, 2.2, (p) => {
        p.moveTo(50, 73)
        p.lineTo(50, 80)
        p.moveTo(40, 80)
        p.quadraticCurveTo(50, 87, 60, 80)
      })
    },
  },
  {
    name: 'crewmate',
    w: 100,
    h: 110,
    palette: ['#D9534F', '#A8393A', '#9ED6E8', '#FFFFFF'],
    draw: (c) => {
      c.fillStyle = '#A8393A'
      c.beginPath()
      c.roundRect(8, 38, 18, 44, 8)
      c.fill()
      c.fillStyle = '#D9534F'
      c.beginPath()
      c.roundRect(20, 8, 64, 86, [32, 32, 10, 10])
      c.fill()
      c.beginPath()
      c.roundRect(20, 80, 26, 28, 8)
      c.roundRect(58, 80, 26, 28, 8)
      c.fill()
      c.fillStyle = '#9ED6E8'
      c.beginPath()
      c.roundRect(46, 24, 46, 28, 14)
      c.fill()
      ell(c, '#FFFFFF', 64, 32, 10, 4)
    },
  },
]

