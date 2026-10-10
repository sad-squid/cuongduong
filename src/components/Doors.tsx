import { Link } from '@tanstack/react-router'
import { useCrt } from '@/crt/context'
import { useScramble } from './useScramble'

export const ExternalDoor = ({ label, name, href }: { label: string; name: string; href: string }) => {
  const crt = useCrt()
  const [text, trigger] = useScramble(label, crt.reduceMotion)
  return (
    <a className="door" href={href} aria-label={name} onPointerEnter={trigger} onFocus={trigger}>
      {text}
    </a>
  )
}

export const RouteDoor = ({ label, to, name }: { label: string; to: '/' | '/about' | '/work'; name?: string }) => {
  const crt = useCrt()
  const [text, trigger] = useScramble(label, crt.reduceMotion)
  return (
    <Link className="door" to={to} aria-label={name ?? label} onPointerEnter={trigger} onFocus={trigger}>
      {text}
    </Link>
  )
}
