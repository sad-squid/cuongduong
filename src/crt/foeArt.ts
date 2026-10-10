import type { GridSprite } from './sprites'

export const DUCK: GridSprite = {
  name: 'rubber duck',
  crisp: true,
  palette: ['#DCD7C9', '#F06E61', '#C9C4B8', '#9A958B'],
  grid: [
    '.....AAAA.......',
    '....AAAAAA......',
    '...AAA.AAAA.....',
    '...AAAAAAAABB...',
    '...AAAAAAABBBB..',
    '....AAAAAAABB...',
    '.....AAAAA......',
    '.AA.AAAAAAAA....',
    '.AAAAAAAAAAAAA..',
    '.AAAAAAAAAAAAAA.',
    '.AAAACCCCCAAAAA.',
    '..AAAACCCAAAAA..',
    '...AAAAAAAAAA...',
    '....DDDDDDDD....',
  ],
}

export const TOASTER: GridSprite = {
  name: 'toaster',
  crisp: true,
  palette: ['#9A958B', '#C9C4B8', '#F06E61', '#DCD7C9', '#6B6761'],
  grid: [
    '...DDDD..DDDD...',
    '...DDDD..DDDD...',
    '.AAAAAAAAAAAAAA.',
    '.ABBBBBBBBBBBBA.',
    '.ABEBBBBBBBBEBAE',
    '.ABBE..BB..EBBAE',
    '.ABBB..BB..BBBA.',
    '.ABBBBBBBBBBBBA.',
    '.ABBBCCCCCCBBBA.',
    '.ABBBBCCCCBBBBA.',
    '.ABBBBBBBBBBBBA.',
    '.AAAAAAAAAAAAAA.',
    '..AA........AA..',
  ],
}

export const ONIGIRI: GridSprite = {
  name: 'sentient onigiri',
  crisp: true,
  palette: ['#6B6761', '#F0EEE9', '#F06E61', '#45423E'],
  grid: [
    '.......BB.......',
    '......BBBB......',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '....B.BBBB.B....',
    '...BB.BBBB.BB...',
    '...BCBBBBBBCB...',
    '..BBBBB..BBBBB..',
    '..BBBBBBBBBBBB..',
    '.BBBAAAAAAAABBB.',
    '.BBBAAADDAAABBB.',
    'BBBBAAAAAAAABBBB',
    'BBBBAAAAAAAABBBB',
  ],
}

export const CHAIR: GridSprite = {
  name: 'office chair',
  crisp: true,
  palette: ['#9A958B', '#C9C4B8', '#6B6761', '#DCD7C9', '#F06E61'],
  grid: [
    '...AAAAAAAA...',
    '..AAAAAAAAAA..',
    '..AA.AAAA.AA..',
    '..AAAAAAAAAA..',
    '..AAAEEEEAAA..',
    '..AAAE..EAAA..',
    '...AAAAAAAA...',
    'B....CCCC....B',
    'BBBBBBBBBBBBBB',
    '.BBBBBBBBBBBB.',
    '......CC......',
    '......CC......',
    '..CCCCCCCCCC..',
    '.C....CC....C.',
    'D.....DD.....D',
  ],
}

export const SOCK: GridSprite = {
  name: 'angry sock',
  crisp: true,
  palette: ['#F06E61', '#F0EEE9', '#DCD7C9', '#9A958B', '#B58484'],
  grid: [
    '.AAAAAAAA...',
    '.BBBBBBBB...',
    '.AAAAAAAA...',
    '.CCCCCCCC...',
    '.CECCCCEC...',
    '.CCECCECC...',
    '.CC.CC.CC...',
    '.CCCCCCCC...',
    '.CCEEEECC...',
    '.CECCCCECC..',
    '.CCCCCCCCCCC',
    '..CCCCCCCCCC',
    '...CCCCCCCCC',
    '....DDDDDDD.',
  ],
}

export const UFO_CAT: GridSprite = {
  name: 'tiny ufo cat',
  crisp: true,
  palette: ['#DCD7C9', '#F06E61', '#9A958B', '#C9C4B8', '#F0EEE9'],
  grid: [
    '.....A....A.....',
    '.....AA..AA.....',
    '....AAAAAAAA....',
    '....A.AAAA.A....',
    '....AAABBAAA....',
    '.C..AAAAAAAA..C.',
    '..CCCCCCCCCCCC..',
    '.DDDDDDDDDDDDDD.',
    'DDEDDEDDEDDEDDED',
    '.DDDDDDDDDDDDDD.',
    '...D...DD...D...',
  ],
}

export const BUG: GridSprite = {
  name: 'bug',
  crisp: true,
  palette: ['#9A958B', '#C9C4B8'],
  grid: [
    '.A...A.',
    '..A.A..',
    '.BBBBB.',
    'B.BBB.B',
    '.BBBBB.',
    'B.B.B.B',
  ],
}

export const VENDING: GridSprite = {
  name: 'vending machine',
  crisp: true,
  palette: ['#9A958B', '#C9C4B8', '#F06E61', '#DCD7C9', '#6B6761', '#F0EEE9', '#45423E'],
  grid: [
    'AAAAAAAAAAAAAA',
    'ACDECDECDECDEA',
    'ACDECDECDECDEA',
    'AAAAAAAAAAAAAA',
    'AECDECDECDECDA',
    'AECDECDECDECDA',
    'AAAAAAAAAAAAAA',
    'ABBBBBBBBBBBBA',
    'ABGBBBBBBBBGBA',
    'ABBGGBBBBGGBBA',
    'ABBF.BBBB.FBBA',
    'ABBFFBBBBFFBBA',
    'ABBBBBBBBBBBBA',
    'ABBB......BBBA',
    'ABBBBBBBBBBBBA',
    'AAAAAAAAAAAAAA',
    '.AA........AA.',
    '.DD........DD.',
  ],
}

export const BIG_FACE: GridSprite = {
  name: 'big goofy face',
  crisp: true,
  palette: ['#6B6761', '#9A958B', '#45423E', '#F0EEE9', '#C9C4B8', '#F06E61', '#B58484', '#F0EEE9'],
  grid: [
    '.......AAAAAAAAAA.......',
    '.....AABBBBBBBBBBAA.....',
    '....ABBBBBBBBBBBBBBA....',
    '...ABBBBBBBBBBBBBBBBA...',
    '..ABBCCCCBBBBBBCCCCBBA..',
    '..ABBBBBBBBBBBBBBBBBBA..',
    '.ABBDDDDDBBBBBBDDDDDBBA.',
    '.ABDDDDDDDBBBBDDDDDDDBA.',
    'ABBDDDDD..BBBB..DDDDDBBA',
    'ABBDDDDD..BBBB..DDDDDBBA',
    'ABBBDDDDDDBBBBDDDDDDBBBA',
    'ABBBBDDDDBBBBBBDDDDBBBBA',
    'ABBBBBBBBBBEEBBBBBBBBBBA',
    'ABFFBBBBBBEEEEBBBBBBFFBA',
    'ABFFBBBBBBBBBBBBBBBBFFBA',
    'ABBAAAAAAAAAAAAAAAAAABBA',
    'ABBAHHHAHHHAHHHAHHHAABBA',
    'ABBA................ABBA',
    '.ABBA....GGGGGG....ABBA.',
    '..ABBAAAAAAAAAAAAAABBA..',
    '...ABBBBBBBBBBBBBBBBA...',
    '.....AABBBBBBBBBBAA.....',
    '.......AAAAAAAAAA.......',
  ],
}

export const FOE_ROSTER: GridSprite[] = [DUCK, TOASTER, ONIGIRI, CHAIR, SOCK, UFO_CAT]

export const FOE_ART: Record<string, GridSprite> = {
  duck: DUCK,
  toaster: TOASTER,
  onigiri: ONIGIRI,
  chair: CHAIR,
  sock: SOCK,
  ufo: UFO_CAT,
  bug: BUG,
  vending: VENDING,
  face: BIG_FACE,
}

export type BulletShape = 'dot' | 'heart' | 'skull' | 'diamond'

export const BULLET_ART: Record<Exclude<BulletShape, 'dot'>, string[]> = {
  heart: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  skull: ['.XXX.', 'X.X.X', 'XXXXX', '.XXX.', '.X.X.'],
  diamond: ['..X..', '.X.X.', 'X...X', '.X.X.', '..X..'],
}
