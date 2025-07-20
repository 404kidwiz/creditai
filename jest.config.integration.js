const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// Integration testing specific configuration
const integrationJestConfig = {
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/src/__tests__/setup/integration-setup.ts'
  ],
  testEnvironment: 'node',
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
    '<rootDir>/src/__tests__/integration/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/google-cloud/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/database/**/*.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/lib/**/*.{js,jsx,ts,tsx}',
    'src/app/api/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  // Integration specific settings
  testTimeout: 120000, // 2 minutes for integration tests
  maxWorkers: 2, // Limited workers for integration tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  // Global setup and teardown for integration tests
  globalSetup: '<rootDir>/src/__tests__/setup/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/global-teardown.ts',
}

module.exports = createJestConfig(integrationJestConfig)