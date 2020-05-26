import React, { useCallback, useState } from 'react';
import { navigate } from '@reach/router';

import Logo from './Logo';
import styles from './logo.module.scss';

interface OwnProps {
  logoP1: string;
  logoP2: string;
}

const LogoWrapper: React.FC<OwnProps> = ({ logoP1, logoP2 }) => {
  const [isLogoOpen, setLogoOpen] = useState<Record<string, boolean>>({
    p1: false,
    p2: false,
  });

  const [isNavigating, setNavigating] = useState<boolean>(false);

  const logoClick = useCallback((logoKey) => {
    setLogoOpen((isLogoOpen: Record<string, boolean>) => ({ ...isLogoOpen, [logoKey]: !isLogoOpen[logoKey] }));
  }, []);
  const handleKeyDown = useCallback((e, logoKey) => {
    if (e.keyCode === 13) {
      setLogoOpen((isLogoOpen: Record<string, boolean>) => ({ ...isLogoOpen, [logoKey]: !isLogoOpen[logoKey] }));
    }
  }, []);

  const navigationClick = useCallback(() => {
    setNavigating(true);
    setTimeout(() => navigate('/about'), 800);
  }, []);
  const navigationKeyEvent = useCallback((e) => {
    if (e.keyCode === 13) {
      setNavigating(true);
    }
    setTimeout(() => navigate('/about'), 800);
  }, []);

  return (
    <div className={styles.logoWrapper}>
      <Logo
        imageUrl={logoP1}
        isNavigating={isNavigating}
        isOpen={isLogoOpen.p1}
        logoKey={1}
        onClick={() => logoClick('p1')}
        onKeyDown={(e) => handleKeyDown(e, 'p1')}
      />
      <Logo
        imageUrl={logoP2}
        isNavigating={isNavigating}
        isOpen={isLogoOpen.p2}
        logoKey={2}
        onClick={() => logoClick('p2')}
        onKeyDown={(e) => handleKeyDown(e, 'p2')}
      />
      <div
        onKeyDown={navigationKeyEvent}
        onClick={navigationClick}
        className={styles.hiddenLink + ' noselect'}
        role="button"
        tabIndex={0}
        style={{
          opacity: isLogoOpen.p1 && isLogoOpen.p2 ? '1' : '0',
          visibility: isLogoOpen.p1 && isLogoOpen.p2 ? 'visible' : 'hidden',
        }}
      >
        hello
      </div>
    </div>
  );
};

export default LogoWrapper;
