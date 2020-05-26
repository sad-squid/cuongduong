import React from 'react';
import { useStaticQuery, graphql } from 'gatsby';

import Layout from '../components/Layout';
import SEO from '../components/SEO';
import Logo from '../components/Logo';

import './global.scss';

const HomePage: React.FC = () => {
  const data = useStaticQuery(graphql`
    query HomePageQuery {
      ...homePageLogoP1Query
      ...homePageLogoP2Query
    }
  `);

  return (
    <Layout>
      <SEO title="Home" />
      <Logo logoP1={data.logop1.childImageSharp.fluid.src} logoP2={data.logop2.childImageSharp.fluid.src} />
    </Layout>
  );
};

export default HomePage;
