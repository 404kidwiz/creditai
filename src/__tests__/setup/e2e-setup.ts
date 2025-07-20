/**
 * E2E test setup
 * Browser automation and component testing setup
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { beforeEach, afterEach } from '@jest/globals'

// Extend expect matchers for E2E testing
expect.extend({
  toBeInTheDocument: expect.anything(),
  toHaveClass: expect.anything(),
  toBeVisible: expect.anything(),
  toBeDisabled: expect.anything(),
  toHaveValue: expect.anything(),
  toHaveTextContent: expect.anything(),
})

// Global E2E test configuration
const E2E_CONFIG = {
  timeout: 300000, // 5 minutes
  retries: 2,
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  viewport: {
    width: 1280,
    height: 720
  }
}

// Mock browser APIs for E2E tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock File API for upload testing
Object.defineProperty(window, 'File', {
  writable: true,
  value: class File {
    name: string
    size: number
    type: string
    lastModified: number
    
    constructor(fileBits: any[], name: string, options: any = {}) {
      this.name = name
      this.size = fileBits.length
      this.type = options.type || ''
      this.lastModified = options.lastModified || Date.now()
    }
  }
})

// Mock FileReader for file processing tests
Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: class FileReader {
    readyState: number = 0
    result: string | ArrayBuffer | null = null
    error: any = null
    onload: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null
    onprogress: ((event: any) => void) | null = null
    
    readAsDataURL(file: File) {
      setTimeout(() => {
        this.readyState = 2
        this.result = `data:${file.type};base64,dGVzdCBkYXRh`
        if (this.onload) {
          this.onload({ target: this })
        }
      }, 100)
    }
    
    readAsArrayBuffer(file: File) {
      setTimeout(() => {
        this.readyState = 2
        this.result = new ArrayBuffer(8)
        if (this.onload) {
          this.onload({ target: this })
        }
      }, 100)
    }
    
    readAsText(file: File) {
      setTimeout(() => {
        this.readyState = 2
        this.result = 'test file content'
        if (this.onload) {
          this.onload({ target: this })
        }
      }, 100)
    }
  }
})

// Mock Canvas API for image processing
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
  }),
  putImageData: jest.fn(),
  createImageData: jest.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
  }),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn().mockReturnValue({ width: 0 }),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
})

// Mock PDF.js for PDF processing tests
jest.mock('pdfjs-dist', () => ({
  getDocument: jest.fn().mockResolvedValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: jest.fn().mockResolvedValue({
        getTextContent: jest.fn().mockResolvedValue({
          items: [
            { str: 'Sample credit report text' },
            { str: 'Account information' },
            { str: 'Payment history' }
          ]
        }),
        render: jest.fn().mockResolvedValue({})
      })
    })
  }),
  GlobalWorkerOptions: {
    workerSrc: '/mock-worker.js'
  }
}))

// Mock Google AI for AI testing
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            personalInfo: {
              name: 'John Doe',
              address: '123 Main St, Anytown, CA 12345'
            },
            creditScores: {
              experian: { score: 720, date: '2024-01-15', bureau: 'experian' }
            },
            accounts: [],
            negativeItems: [],
            inquiries: [],
            publicRecords: []
          })
        }
      })
    })
  }))
}))

// Setup and teardown for each E2E test
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks()
  
  // Setup DOM environment
  document.body.innerHTML = ''
  
  // Reset window location
  delete (window as any).location
  ;(window as any).location = {
    href: E2E_CONFIG.baseUrl,
    origin: E2E_CONFIG.baseUrl,
    pathname: '/',
    search: '',
    hash: ''
  }
})

afterEach(() => {
  // Cleanup React Testing Library
  cleanup()
  
  // Clear any timers
  jest.clearAllTimers()
  
  // Reset DOM
  document.body.innerHTML = ''
})

// Global test utilities
const testUtils = {
  createMockFile: (name: string, type: string, content: string = 'test content') => {
    return new File([content], name, { type })
  },
  
  createMockPdfFile: (name: string = 'test-report.pdf') => {
    return new File(['%PDF-1.4 mock pdf content'], name, { type: 'application/pdf' })
  },
  
  createMockImageFile: (name: string = 'test-image.jpg') => {
    return new File(['mock image content'], name, { type: 'image/jpeg' })
  },
  
  waitForAsyncOperation: (ms: number = 100) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  },
  
  mockApiResponse: (data: any, success: boolean = true) => {
    return {
      ok: success,
      status: success ? 200 : 400,
      json: jest.fn().mockResolvedValue({
        success,
        data: success ? data : undefined,
        error: success ? undefined : 'Mock error'
      })
    }
  }
}

// Make test utilities globally available
;(global as any).testUtils = testUtils

console.log('🧨 E2E test setup completed')