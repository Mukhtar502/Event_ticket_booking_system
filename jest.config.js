/**
 * Jest Configuration
 *
 * WHAT IT DOES:
 * - Configures Jest test runner
 * - Sets environment, timeout, coverage settings
 *
 * KEY SETTINGS:
 * - testEnvironment: node (we're testing Node.js, not browser)
 * - testTimeout: 30000ms (tests can take time for DB operations)
 * - collectCoverageFrom: what files to include in coverage report
 */

export default {
  testEnvironment: "node",
  testTimeout: 30000,
  maxWorkers: 1, // Run tests serially to avoid database connection conflicts
  collectCoverageFrom: ["src/**/*.js", "!src/config/**", "!src/migrations/**"],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {},
  testMatch: [
    "**/tests/unit/**/*.test.js",
    "**/tests/integration/**/*.test.js",
  ],
};
