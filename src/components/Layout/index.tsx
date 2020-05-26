import React from 'react';
import { Helmet } from 'react-helmet';

const Layout: React.FC = ({ children }) => {
  return (
    <>
      <Helmet>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap" rel="stylesheet" />
      </Helmet>
      <main>{children}</main>
    </>
  );
};

export default Layout;
