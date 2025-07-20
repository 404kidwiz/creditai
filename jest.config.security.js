const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// Security testing specific configuration
const securityJestConfig = {
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/src/__tests__/setup/security-setup.ts'
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
    '<rootDir>/src/__tests__/security/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/compliance/**/*.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/lib/security/**/*.{js,jsx,ts,tsx}',
    'src/app/api/**/*.{js,jsx,ts,tsx}',
    'src/middleware.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  // Security specific settings
  testTimeout: 60000, // 1 minute for security tests
  maxWorkers: 1, // Run security tests sequentially
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  // Enable strict mode for security tests
  errorOnDeprecated: true,
  testFailureExitCode: 1,
}

module.exports = createJestConfig(securityJestConfig)