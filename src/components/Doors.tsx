import { Link } from '@tanstack/react-router'
import { useCrt } from '@/crt/context'
import { useScramble } from './useScramble'
import { DotIcon } from './DotIcon'

type Labels = { label: string }

export const IconDoor = ({ icon, name, href }: { icon: 'github' | 'linkedin'; name: string; href: string }) => (
  <a className="icon-door" href={href} aria-label={name}>
    <DotIcon icon={icon} />
  </a>
)

export const RouteDoor = ({ label, to }: Labels & { to: '/' | '/about' | '/work' }) => {
  const crt = useCrt()
  const [text, trigger] = useScramble(label, crt.reduceMotion)
  return (
    <Link
      className="door"
      to={to}
      aria-label={label}
      onPointerEnter={() => {
        trigger()
        crt.sound.play('hover')
      }}
      onFocus={trigger}
    >
      {text}
    </Link>
  )
}
