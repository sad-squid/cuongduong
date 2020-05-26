import React, { useState } from 'react';
import { useStaticQuery, graphql } from 'gatsby';
import { useSpring, animated } from 'react-spring';

import styles from './animatedIntro.module.scss';

const AnimatedIntro: React.FC = () => {
  const data = useStaticQuery(graphql`
    query AnimatedIntroQuery {
      ...githubLogoQuery
      ...twitterLogoQuery
      ...instagramLogoQuery
    }
  `);

  const [isTransitioning, setTransitioning] = useState<boolean>(true);
  const [animatedHello] = useSpring(
    {
      from: { transform: 'translate3d(0, 0, 0)' },
      to: async (next) => {
        await next({ border: 'none' });
        await next({ transform: 'translate3d(0, -200px, 0)' });
        await next({ transform: 'translate3d(-110px, -212px, 0)' });
        await next({ fontSize: '24px' });
        await next({ fontWeight: 'bold' });
        setTransitioning(false);
      },
    },
    []
  );
  return (
    <div className={styles.introWrapper}>
      <animated.div className={styles.animatedHello + ' noselect'} style={animatedHello}>
        hello
      </animated.div>
      <animated.div
        className={styles.animatedIntro}
        id={styles.myname}
        style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}
      >
        <strong>,</strong> my name is <span className={styles.coloredIntroText}>Cuong</span>.
      </animated.div>
      <div className={styles.introBlock}>
        <animated.div className={styles.animatedIntro} style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}>
          I&rsquo;m a software developer
          <br />
          working on{' '}
          <a
            className={styles.coloredIntroText}
            href="https://www.target.com"
            rel="noreferrer noopener"
            target="_blank"
          >
            Target.com
          </a>
          .
        </animated.div>
        <animated.div
          id={styles.firstInList}
          className={styles.animatedIntro}
          style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}
        >
          I&rsquo;m passionate about . . .
        </animated.div>
        <animated.div className={styles.animatedIntroRight} style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}>
          - gaming{' '}
          <span role="img" aria-label="pc and dice emoji">
            🖥️🎲
          </span>
        </animated.div>
        <animated.div className={styles.animatedIntroRight} style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}>
          - design{' '}
          <span role="img" aria-label="art and swirl emoji">
            🎨🍥
          </span>
        </animated.div>
        <animated.div className={styles.animatedIntroRight} style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}>
          - travel{' '}
          <span role="img" aria-label="plane and boat emoji">
            ✈️⛵
          </span>
        </animated.div>
        <animated.div className={styles.animatedIntro} style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}>
          <br />
          But mostly,
        </animated.div>
        <animated.div className={styles.animatedIntro} style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}>
          I love some good pasta{' '}
          <span role="img" aria-label="spaghetti emoji">
            🍝
          </span>
        </animated.div>
        <animated.div
          className={styles.animatedIntro}
          id={styles.lastInList}
          style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}
        >
          Thanks for swingin&rsquo; by ~
        </animated.div>
        <animated.div className={styles.links} style={isTransitioning ? { opacity: 0 } : { opacity: 1 }}>
          <a className={styles.link} href="https://github.com/sad-squid/" rel="noreferrer noopener" target="_blank">
            <img alt="link to github" src={data.githubLogo.childImageSharp.fluid.src} />
          </a>
          <a className={styles.link} href="https://twitter.com/asadsquid/" rel="noreferrer noopener" target="_blank">
            <img alt="link to twitter" src={data.twitterLogo.childImageSharp.fluid.src} />
          </a>
          <a
            className={styles.link}
            href="https://instagram.com/cuongduong152/"
            rel="noreferrer noopener"
            target="_blank"
          >
            <img alt="link to instagram" src={data.instagramLogo.childImageSharp.fluid.src} />
          </a>
        </animated.div>
      </div>
    </div>
  );
};
export default AnimatedIntro;
