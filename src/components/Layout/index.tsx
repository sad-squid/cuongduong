import React from 'react';
import { Header } from './Header';
import * as styles from './layout.module.scss';

const Layout: React.FC = ({ children }) => {
  return (
    <>
      <Header>helo</Header>
      <div className={styles.mainContent}>
        <main>{children}</main>
      </div>
    </>
  );
};

export default Layout;
