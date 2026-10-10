import { useId, type ReactNode } from 'react'

export type IconName = 'github' | 'linkedin' | 'fireworks'

const SIZE = 22
const PITCH = 2
const RADIUS = 0.95

const ICONS: Record<IconName, { box: number; draw: (fill: string) => ReactNode }> = {
  github: {
    box: 16,
    draw: (fill) => (
      <path
        fill={fill}
        d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
      />
    ),
  },
  linkedin: {
    box: 24,
    draw: (fill) => (
      <path
        fill={fill}
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    ),
  },
  fireworks: {
    box: 24,
    draw: (fill) => (
      <>
        <path
          stroke={fill}
          strokeWidth={3.2}
          strokeLinecap="round"
          d="M12 1.8v4.6M12 17.6v4.6M1.8 12h4.6M17.6 12h4.6M4.8 4.8l3.2 3.2M16 16l3.2 3.2M19.2 4.8 16 8M8 16l-3.2 3.2"
        />
        <circle cx={12} cy={12} r={3.4} fill={fill} />
      </>
    ),
  },
}

export const DotIcon = ({ icon }: { icon: IconName }) => {
  const id = `dots-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const { box, draw } = ICONS[icon]
  const unit = box / SIZE
  return (
    <svg className="dot-icon" viewBox={`0 0 ${box} ${box}`} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width={PITCH * unit} height={PITCH * unit} patternUnits="userSpaceOnUse">
          <circle cx={unit} cy={unit} r={RADIUS * unit} fill="currentColor" />
        </pattern>
      </defs>
      {draw(`url(#${id})`)}
    </svg>
  )
}
