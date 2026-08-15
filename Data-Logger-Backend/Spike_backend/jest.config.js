export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/logs/**', '!src/docs/**'],
  coverageDirectory: 'coverage',
  verbose: true,
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  // Jest's native ESM support requires transform to be empty - no Babel.
  transform: {},
};
