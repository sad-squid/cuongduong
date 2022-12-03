import React from 'react';
import { useStaticQuery, graphql } from 'gatsby';

import './global.scss';
import * as styles from './home.module.scss';
import Layout from '../components/Layout';
import { Intro } from '../components/Intro';
import { SEO } from '../components/SEO';

const HomePage: React.FC = () => {
  const data = useStaticQuery(graphql`
    query HomePageQuery {
      ...homePageProfileQuery
    }
  `);

  return (
    <Layout>
      <SEO title="Home" />
      <div className={styles.homeContainer}>
        <Intro />
        <img
          className={styles.profilePic}
          alt="profile"
          aria-label="profile picture"
          src={data.profile.childImageSharp.fluid.src}
        />
      </div>
    </Layout>
  );
};

export default HomePage;
