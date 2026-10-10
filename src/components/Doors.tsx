import { Link } from '@tanstack/react-router'
import { useCrt } from '@/crt/context'
import { useScramble } from './useScramble'

type Labels = { label: string; short?: string }

const Label = ({ text, short }: { text: string; short: string | undefined }) =>
  short ? (
    <>
      <span className="label-long">{text}</span>
      <span className="label-short" aria-hidden="true">
        {short}
      </span>
    </>
  ) : (
    text
  )

export const ExternalDoor = ({ label, short, name, href }: Labels & { name: string; href: string }) => {
  const crt = useCrt()
  const [text, trigger] = useScramble(label, crt.reduceMotion)
  return (
    <a className="door" href={href} aria-label={name} onPointerEnter={trigger} onFocus={trigger}>
      <Label text={text} short={short} />
    </a>
  )
}

export const RouteDoor = ({ label, to }: Labels & { to: '/' | '/about' | '/work' }) => {
  const crt = useCrt()
  const [text, trigger] = useScramble(label, crt.reduceMotion)
  return (
    <Link className="door" to={to} aria-label={label} onPointerEnter={trigger} onFocus={trigger}>
      {text}
    </Link>
  )
}
