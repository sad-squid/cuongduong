import React from 'react';
import * as styles from './header.module.scss';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.titleContainer}>
          <a className={styles.title} href="/">
            <span className={styles.caret}> {'> '}</span>cuongduong
            <span className={styles.name}>.dev</span>
          </a>
        </div>
      </div>
    </header>
  );
};
