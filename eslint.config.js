const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/', 'dist/', 'build/'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'prettier/prettier': ['warn', { endOfLine: 'auto' }],
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      'global-require': 'off',
      'no-console': 'off',
      'no-param-reassign': ['error', { props: false }],
    },
  },
  eslintPluginPrettierRecommended,
];
