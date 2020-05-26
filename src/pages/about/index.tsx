import React from 'react';

import Layout from '../../components/Layout';
import SEO from '../../components/SEO';
import AnimatedIntro from '../../components/AnimatedIntro';

import '../global.scss';

const AboutPage: React.FC = () => {
  return (
    <Layout>
      <SEO title="About cuongduong.dev" />
      <AnimatedIntro />
    </Layout>
  );
};

export default AboutPage;
