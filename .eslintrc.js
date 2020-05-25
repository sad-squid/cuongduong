module.exports = {
  parser: `@typescript-eslint/parser`,
  plugins: ['@typescript-eslint', 'prettier', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended', // Uses the recommended rules from @eslint-plugin-react
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'prettier',
    'prettier/react',
    'prettier/@typescript-eslint', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  env: {
    browser: true,
    node: true,
  },
  rules: {
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/quotes': 'off',
    'react/prop-types': 'off',
    indent: ['error', 2, { SwitchCase: 1 }],
  },
  settings: {
    react: {
      version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
    },
  },
};
