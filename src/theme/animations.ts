export const cellEntrance = (delay: number) => ({
  '@keyframes cellEnter': {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `cellEnter 0.5s ease-out ${delay}ms both`,
  },
})

// A rule line drawing itself across the page, left to right
export const ruleDraw = (delay: number) => ({
  '@keyframes ruleDraw': {
    from: { transform: 'scaleX(0)' },
    to: { transform: 'scaleX(1)' },
  },
  transformOrigin: 'left',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `ruleDraw 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
  },
})
