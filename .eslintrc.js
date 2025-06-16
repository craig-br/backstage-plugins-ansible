module.exports = {
  root: true,
  ignorePatterns: [
    '**/*.d.ts',
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-dynamic/**',
  ],
  parserOptions: {
    parser: 'typescript',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
};
