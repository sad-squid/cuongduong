import React from 'react';
import { useStaticQuery, graphql } from 'gatsby';

import styles from './layout.module.scss';

const Layout: React.FC = () => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
      fileName: file(relativePath: { eq: "icon.png" }) {
        childImageSharp {
          fluid(maxWidth: 512, maxHeight: 512) {
            ...GatsbyImageSharpFluid
          }
        }
      }
    }
  `);
  return (
    <>
      <main style={{ background: '#222', display: 'flex', height: '100vh', justifyContent: 'center', margin: '0' }}>
        <img
          alt="cuongduong-logo"
          className={styles.logo}
          height="152px"
          src={data.fileName.childImageSharp.fluid.src}
        />
      </main>
    </>
  );
};

export default Layout;
