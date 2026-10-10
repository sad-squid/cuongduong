const BODY = ['....###....', '...#####...', '..#######..', '.#########.', '.#########.', '.##.###.##.', '.#########.', '..#######..']
const LEGS_A = ['..#.#.#.#..', '.#..#.#..#.', '.#.#...#.#.']
const LEGS_B = ['..#.#.#.#..', '..#.#.#.#..', '.#..#.#..#.']

const dots = (rows: string[], top: number) =>
  rows.flatMap((row, y) => [...row].flatMap((cell, x) => (cell === '#' ? [<circle key={`${x}-${y + top}`} cx={x + 0.5} cy={y + top + 0.5} r={0.42} />] : [])))

export const SquidIcon = () => (
  <svg className="dot-icon squid-icon" viewBox="0 0 11 11" width={22} height={22} aria-hidden="true" fill="currentColor">
    <g className="squid-bob">
      {dots(BODY, 0)}
      <g className="squid-legs-a">{dots(LEGS_A, 8)}</g>
      <g className="squid-legs-b">{dots(LEGS_B, 8)}</g>
    </g>
  </svg>
)
