import React from 'react';

import Layout from '../components/Layout';
import SEO from '../components/SEO';

import './global.scss';

const IndexPage: React.FC = () => (
  <Layout>
    <SEO title="Home" />
  </Layout>
);

export default IndexPage;
