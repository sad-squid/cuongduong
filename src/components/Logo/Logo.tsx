import React from 'react';
import { useSpring, animated } from 'react-spring';
import useHover from './useHover';

import styles from './logo.module.scss';

const interp = (index: number) => (r: any) => `translate3d(0, ${6 * Math.sin(r + (index * 2 * Math.PI) / 1.6)}px, 0)`;

interface OwnProps {
  imageUrl: string;
  isOpen: boolean;
  isNavigating: boolean;
  logoKey: number;
  onClick: () => void;
  onKeyDown: (event: React.SyntheticEvent) => void;
}

const Logo: React.FC<OwnProps> = ({ imageUrl, isOpen, logoKey = 0, onClick, onKeyDown, isNavigating }) => {
  const [hoverRef, isHovering] = useHover();
  const [bounceStyles] = useSpring(
    {
      to: { radians: 2 * Math.PI },
      from: { radians: 0 },
      loop: () => !isHovering,
      pause: isHovering,
      config: { duration: 2000 },
    },
    [isHovering]
  );
  const openDirection = logoKey === 2 ? '40px' : '-40px';
  const routeChangeDirection = logoKey === 2 ? '200px' : '-200px';

  const defaultStyles = {
    backgroundImage: `url(${imageUrl})`,
    transform: bounceStyles.radians.to(interp(logoKey)),
    transitionProperty: 'opacity filter',
    transitionDuration: '.5s',
    opacity: isHovering ? '1' : '.5',
    filter: 'grayscale(60%)',
  };
  const isOpenStyles = isOpen
    ? {
        filter: 'grayscale(0%)',
        opacity: '1',
        transform: `translate3d(${openDirection},0 ,0)`,
        transitionProperty: 'transform opacity filter',
      }
    : {};
  const routeChangeStyles = isNavigating
    ? {
        transform: `translate3d(${routeChangeDirection},0 ,0)`,
        transition: 'transform .4s, opacity .6s, filter .8s',
        opacity: 0,
        filter: 'grayscale(100%)',
      }
    : {};

  return (
    <animated.div
      ref={hoverRef}
      className={styles.logo}
      key={logoKey}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{ ...defaultStyles, ...isOpenStyles, ...routeChangeStyles }}
      tabIndex={0}
    />
  );
};

export default Logo;
