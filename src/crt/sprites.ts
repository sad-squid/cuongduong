export type Sprite = {
  name: string
  w: number
  h: number
  palette: string[]
  ega: string[]
  pico: string[]
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

const shine = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, glint: number) => {
  ell(c, HOLE, x, y, rx, ry)
  ell(c, '#FFFFFF', x - rx * 0.3, y - ry * 0.35, glint, glint)
}

const face = (c: CanvasRenderingContext2D, y: number, blush: string | null) => {
  if (blush) {
    ell(c, blush, 25, y + 10, 7.5, 4)
    ell(c, blush, 75, y + 10, 7.5, 4)
  }
  shine(c, 37, y, 4.2, 5.2, 1.4)
  shine(c, 63, y, 4.2, 5.2, 1.4)
  stroke(c, HOLE, 2, (p) => {
    p.moveTo(45, y + 9)
    p.quadraticCurveTo(47.5, y + 12, 50, y + 9.5)
    p.quadraticCurveTo(52.5, y + 12, 55, y + 9)
  })
}

const chibi = (c: CanvasRenderingContext2D, skin: string, headY: number) => {
  ell(c, skin, 38, 113, 9, 5)
  ell(c, skin, 62, 113, 9, 5)
  ell(c, skin, 50, 96, 24, 17)
  ell(c, skin, 26, 94, 7, 6, -0.6)
  ell(c, skin, 74, 94, 7, 6, 0.6)
  ell(c, skin, 50, headY, 45, 33)
}

export const SPRITES: Sprite[] = [
  {
    name: 'chiikawa',
    w: 100,
    h: 120,
    palette: ['#F4F1EA', '#F2A7B5', '#FFFFFF', HOLE],
    ega: ['#FFFFFF', '#FF55FF', '#FFFFFF', HOLE],
    pico: ['#FFF1E8', '#FF77A8', '#FFF1E8', HOLE],
    draw: (c) => {
      ell(c, '#F4F1EA', 27, 24, 9, 8.5)
      ell(c, '#F4F1EA', 73, 24, 9, 8.5)
      chibi(c, '#F4F1EA', 56)
      face(c, 56, '#F2A7B5')
    },
  },
  {
    name: 'hachiware',
    w: 100,
    h: 120,
    palette: ['#F4F1EA', '#7E9BC4', '#F2A7B5', '#FFFFFF', HOLE],
    ega: ['#FFFFFF', '#5555FF', '#FF55FF', '#FFFFFF', HOLE],
    pico: ['#FFF1E8', '#29ADFF', '#FF77A8', '#FFF1E8', HOLE],
    draw: (c) => {
      poly(c, '#7E9BC4', [10, 52, 15, 10, 42, 34])
      poly(c, '#7E9BC4', [90, 52, 85, 10, 58, 34])
      poly(c, '#F2A7B5', [16, 42, 18, 22, 32, 35])
      poly(c, '#F2A7B5', [84, 42, 82, 22, 68, 35])
      chibi(c, '#F4F1EA', 58)
      c.save()
      c.beginPath()
      c.ellipse(50, 58, 45, 33, 0, 0, Math.PI * 2)
      c.clip()
      c.fillStyle = '#7E9BC4'
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(48.5, 0)
      c.quadraticCurveTo(46, 40, 0, 56)
      c.closePath()
      c.moveTo(100, 0)
      c.lineTo(51.5, 0)
      c.quadraticCurveTo(54, 40, 100, 56)
      c.closePath()
      c.fill()
      c.restore()
      face(c, 60, '#F2A7B5')
    },
  },
  {
    name: 'usagi',
    w: 100,
    h: 130,
    palette: ['#F6E3A1', '#F2A7B5', '#FFFFFF', HOLE],
    ega: ['#FFFF55', '#FF55FF', '#FFFFFF', HOLE],
    pico: ['#FFEC27', '#FF77A8', '#FFF1E8', HOLE],
    draw: (c) => {
      ell(c, '#F6E3A1', 40, 26, 7, 25, -0.06)
      ell(c, '#F6E3A1', 60, 26, 7, 25, 0.06)
      c.translate(0, 10)
      chibi(c, '#F6E3A1', 56)
      ell(c, HOLE, 38, 54, 3, 3)
      ell(c, HOLE, 62, 54, 3, 3)
      ell(c, HOLE, 50, 67, 7, 8)
      ell(c, '#F2A7B5', 50, 71, 4, 3)
      c.translate(0, -10)
    },
  },
  {
    name: 'pikachu',
    w: 110,
    h: 104,
    palette: ['#F7D046', '#E8573F', '#FFFFFF', '#6B625A', HOLE],
    ega: ['#FFFF55', '#FF5555', '#FFFFFF', '#555555', HOLE],
    pico: ['#FFEC27', '#FF004D', '#FFF1E8', '#5F574F', HOLE],
    draw: (c) => {
      const ear = (base: number[], tip: number[]) => {
        poly(c, '#6B625A', base)
        c.save()
        c.beginPath()
        c.moveTo(base[0], base[1])
        for (let i = 2; i < base.length; i += 2) c.lineTo(base[i], base[i + 1])
        c.closePath()
        c.clip()
        poly(c, '#F7D046', tip)
        c.restore()
      }
      ear([30, 44, 4, 2, 46, 34], [0, 110, 0, 30, 60, 10, 60, 110])
      ear([80, 44, 106, 2, 64, 34], [110, 110, 110, 30, 50, 10, 50, 110])
      ell(c, '#F7D046', 55, 64, 44, 36)
      ell(c, '#E8573F', 22, 76, 9, 8)
      ell(c, '#E8573F', 88, 76, 9, 8)
      shine(c, 37, 58, 6.5, 6.5, 2.4)
      shine(c, 73, 58, 6.5, 6.5, 2.4)
      ell(c, HOLE, 55, 68, 2, 1.4)
      stroke(c, HOLE, 2.2, (p) => {
        p.moveTo(47, 75)
        p.quadraticCurveTo(51, 79, 55, 75)
        p.quadraticCurveTo(59, 79, 63, 75)
      })
    },
  },
  {
    name: 'pepe',
    w: 110,
    h: 90,
    palette: ['#5FA052', '#F4F1EA', '#B5503E', '#3F7A38', HOLE],
    ega: ['#00AA00', '#FFFFFF', '#AA5500', '#555555', HOLE],
    pico: ['#008751', '#FFF1E8', '#AB5236', '#1D2B53', HOLE],
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
    name: 'handsome squidward',
    w: 100,
    h: 120,
    palette: ['#9AD3C8', '#5E968D', '#D2F1EA', '#FFFFFF', HOLE],
    ega: ['#55FFFF', '#00AAAA', '#FFFFFF', '#FFFFFF', HOLE],
    pico: ['#29ADFF', '#83769C', '#C2C3C7', '#FFF1E8', HOLE],
    draw: (c) => {
      ell(c, '#9AD3C8', 50, 30, 34, 27)
      poly(c, '#9AD3C8', [16, 30, 84, 30, 88, 84, 78, 108, 22, 108, 12, 84])
      poly(c, '#5E968D', [14, 42, 46, 36, 46, 46, 14, 50])
      poly(c, '#5E968D', [86, 42, 54, 36, 54, 46, 86, 50])
      ell(c, '#FFFFFF', 31, 55, 9, 4.5)
      ell(c, '#FFFFFF', 69, 55, 9, 4.5)
      ell(c, HOLE, 33, 55, 3.6, 3.6)
      ell(c, HOLE, 67, 55, 3.6, 3.6)
      poly(c, '#5E968D', [20, 66, 34, 72, 30, 90, 22, 92])
      poly(c, '#5E968D', [80, 66, 66, 72, 70, 90, 78, 92])
      c.fillStyle = '#5E968D'
      c.beginPath()
      c.roundRect(44, 42, 16, 36, 7)
      c.fill()
      c.fillStyle = '#D2F1EA'
      c.beginPath()
      c.roundRect(41, 40, 15, 36, 7)
      c.fill()
      ell(c, '#5E968D', 51, 80, 13, 8)
      ell(c, '#D2F1EA', 48.5, 78, 12, 8)
      c.fillStyle = '#FFFFFF'
      c.beginPath()
      c.roundRect(30, 92, 40, 7, 3.5)
      c.fill()
      stroke(c, '#5E968D', 1.4, (p) => {
        p.moveTo(30, 95.5)
        p.lineTo(70, 95.5)
      })
      stroke(c, HOLE, 2.4, (p) => {
        p.moveTo(46, 104)
        p.quadraticCurveTo(50, 101, 54, 104)
      })
    },
  },
  {
    name: 'doge',
    w: 100,
    h: 100,
    palette: ['#E3A857', '#F4E7CF', HOLE],
    ega: ['#AA5500', '#FFFFFF', HOLE],
    pico: ['#FFA300', '#FFF1E8', HOLE],
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
    ega: ['#FF5555', '#AA0000', '#55FFFF', '#FFFFFF'],
    pico: ['#FF004D', '#7E2553', '#29ADFF', '#FFF1E8'],
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
  {
    name: 'kirby',
    w: 110,
    h: 100,
    palette: ['#F4A7C4', '#E25B6E', '#C9416A', '#FFFFFF', HOLE],
    ega: ['#FF55FF', '#FF5555', '#AA0000', '#FFFFFF', HOLE],
    pico: ['#FF77A8', '#FF004D', '#7E2553', '#FFF1E8', HOLE],
    draw: (c) => {
      ell(c, '#C9416A', 30, 88, 20, 11, -0.2)
      ell(c, '#C9416A', 80, 88, 20, 11, 0.2)
      ell(c, '#F4A7C4', 12, 54, 11, 9, -0.5)
      ell(c, '#F4A7C4', 98, 44, 11, 9, 0.5)
      ell(c, '#F4A7C4', 55, 50, 40, 38)
      ell(c, HOLE, 47, 42, 4, 9.5)
      ell(c, HOLE, 63, 42, 4, 9.5)
      ell(c, '#FFFFFF', 47, 37, 2.6, 3.8)
      ell(c, '#FFFFFF', 63, 37, 2.6, 3.8)
      ell(c, '#E25B6E', 34, 56, 7, 3.5)
      ell(c, '#E25B6E', 76, 56, 7, 3.5)
      ell(c, HOLE, 55, 60, 4, 3)
      ell(c, '#E25B6E', 55, 61.5, 2.4, 1.5)
    },
  },
]


export type ColorMode = 'full' | 'ega' | 'pico'
