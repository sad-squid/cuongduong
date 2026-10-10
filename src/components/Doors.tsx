import { DotIcon } from './DotIcon'

export const IconDoor = ({ icon, name, href }: { icon: 'github' | 'linkedin'; name: string; href: string }) => (
  <a className="icon-door" href={href} aria-label={name}>
    <DotIcon icon={icon} />
  </a>
)
