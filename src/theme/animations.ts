export const cellEntrance = (delay: number) => ({
  '@keyframes cellEnter': {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `cellEnter 0.5s ease-out ${delay}ms both`,
  },
})
