import React from 'react';
import { useStaticQuery, graphql } from 'gatsby';

import styles from './intro.module.scss';

export const Intro: React.FC = () => {
  const data = useStaticQuery(graphql`
    query introQuery {
      ...githubLogoQuery
      ...twitterLogoQuery
      ...instagramLogoQuery
      ...linkedInLogoQuery
    }
  `);

  return (
    <div className={styles.introBlock}>
      <div className={styles.intro}>
        Hi, I&rsquo;m<span className={styles.coloredIntroText}> Cuong</span>!
      </div>
      <div className={styles.intro}>
        I&rsquo;m a Viet-Chinese-American engineer who works on the web. I love being a part of projects that inspire
        people. I&rsquo;m passionate about fostering a healthy learning culture and creating that space for everyone.
      </div>
      <div className={styles.intro}>
        Currently, I&rsquo;m working as a software engineer creating and maintaining scalable customer experiences for{' '}
        <a
          className={styles.coloredIntroText}
          href="https://on.zoom.us/e/view"
          rel="noreferrer noopener"
          target="_blank"
        >
          OnZoom
        </a>
        .
      </div>
      <div className={styles.intro}>
        Talk to me about:
        <div className={styles.introRight}>
          - gaming{' '}
          <span role="img" aria-label="pc and dice emoji">
            🖥️🎲
          </span>
        </div>
        <div className={styles.introRight}>
          - design{' '}
          <span role="img" aria-label="art and swirl emoji">
            🎨🍥
          </span>
        </div>
        <div className={styles.introRight}>
          - and travel{' '}
          <span role="img" aria-label="plane and boat emoji">
            ✈️⛵
          </span>
        </div>
      </div>
      <div className={styles.intro} id={styles.lastInList}>
        Let&rsquo;s connect!
      </div>
      <div className={styles.links}>
        <a className={styles.link} href="https://github.com/sad-squid/" rel="noreferrer noopener" target="_blank">
          <img
            className={styles.socialMediaLogo}
            alt="link to github"
            src={data.githubLogo.childImageSharp.fluid.src}
          />
        </a>
        <a className={styles.link} href="https://twitter.com/asadsquid/" rel="noreferrer noopener" target="_blank">
          <img
            className={styles.socialMediaLogo}
            id={styles.twitterLogo}
            alt="link to twitter"
            src={data.twitterLogo.childImageSharp.fluid.src}
          />
        </a>
        <a
          className={styles.link}
          href="https://instagram.com/cuongduong152/"
          rel="noreferrer noopener"
          target="_blank"
        >
          <img
            className={styles.socialMediaLogo}
            alt="link to instagram"
            src={data.instagramLogo.childImageSharp.fluid.src}
          />
        </a>
        <a
          className={styles.link}
          href="https://linkedin.com/in/cuongduong-dev/"
          rel="noreferrer noopener"
          target="_blank"
        >
          {data.linkedInLogo && (
            <img
              className={styles.socialMediaLogo}
              alt="link to linkedin"
              src={data.linkedInLogo.childImageSharp.fluid.src}
            />
          )}
        </a>
      </div>
    </div>
  );
};
