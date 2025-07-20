const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// E2E testing specific configuration
const e2eJestConfig = {
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/src/__tests__/setup/e2e-setup.ts'
  ],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/lib/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
  },
  testMatch: [
    '<rootDir>/src/__tests__/e2e/**/*.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // E2E specific settings
  testTimeout: 300000, // 5 minutes for E2E tests
  maxWorkers: 1, // Run E2E tests sequentially
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  bail: 1, // Stop on first failure for E2E
  // Enable fake timers for E2E tests
  fakeTimers: {
    enableGlobally: false,
  },
}

module.exports = createJestConfig(e2eJestConfig)