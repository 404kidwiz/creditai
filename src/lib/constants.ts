/**
 * Application Constants
 * 
 * This file contains all the constants used throughout the application.
 * It includes configuration values, API endpoints, validation rules, and more.
 */

// ===================================
// Application Configuration
// ===================================
export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'CreditAI',
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'AI-powered credit repair and monitoring platform',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  version: '1.0.0',
  author: 'CreditAI Team',
  keywords: ['credit repair', 'ai', 'finance', 'credit monitoring', 'disputes'],
} as const

// ===================================
// Environment Configuration
// ===================================
export const ENV = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const

// ===================================
// API Configuration
// ===================================
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const

// ===================================
// Route Definitions
// ===================================
export const ROUTES = {
  // Public routes
  home: '/',
  about: '/about',
  pricing: '/pricing',
  contact: '/contact',
  
  // Auth routes
  login: '/auth/login',
  register: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  verifyEmail: '/auth/verify-email',
  mfaVerify: '/auth/mfa-verify',
  
  // Protected routes
  dashboard: '/dashboard',
  profile: '/profile',
  settings: '/settings',
  
  // Feature routes
  reports: '/reports',
  disputes: '/disputes',
  documents: '/documents',
  billing: '/billing',
  
  // API routes
  api: {
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
      mfa: '/api/auth/mfa',
    },
    user: {
      profile: '/api/user/profile',
      settings: '/api/user/settings',
      delete: '/api/user/delete',
    },
    credit: {
      reports: '/api/credit/reports',
      score: '/api/credit/score',
      analysis: '/api/credit/analysis',
    },
    disputes: {
      list: '/api/disputes',
      create: '/api/disputes/create',
      update: '/api/disputes/update',
      delete: '/api/disputes/delete',
      letters: '/api/disputes/letters',
    },
    documents: {
      upload: '/api/documents/upload',
      list: '/api/documents',
      delete: '/api/documents/delete',
      ocr: '/api/documents/ocr',
    },
    webhooks: {
      stripe: '/api/webhooks/stripe',
      plaid: '/api/webhooks/plaid',
    },
  },
} as const

// ===================================
// Feature Flags
// ===================================
export const FEATURE_FLAGS = {
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  enablePWA: process.env.NEXT_PUBLIC_ENABLE_PWA === 'true',
  enableOfflineMode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
  enableDebugMode: process.env.NEXT_PUBLIC_ENABLE_DEBUG_MODE === 'true',
  maintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
} as const

// ===================================
// Subscription Tiers
// ===================================
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const

export const SUBSCRIPTION_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    disputes: 1,
    reports: 1,
    documents: 5,
    aiAnalysis: false,
    support: 'email',
  },
  [SUBSCRIPTION_TIERS.BASIC]: {
    disputes: 5,
    reports: 3,
    documents: 20,
    aiAnalysis: true,
    support: 'email',
  },
  [SUBSCRIPTION_TIERS.PRO]: {
    disputes: -1, // unlimited
    reports: -1, // unlimited
    documents: 100,
    aiAnalysis: true,
    support: 'priority',
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    disputes: -1, // unlimited
    reports: -1, // unlimited
    documents: -1, // unlimited
    aiAnalysis: true,
    support: 'dedicated',
  },
} as const

// ===================================
// Credit Score Ranges
// ===================================
export const CREDIT_SCORE_RANGES = {
  POOR: { min: 300, max: 579, label: 'Poor', color: 'red' },
  FAIR: { min: 580, max: 669, label: 'Fair', color: 'orange' },
  GOOD: { min: 670, max: 739, label: 'Good', color: 'yellow' },
  VERY_GOOD: { min: 740, max: 799, label: 'Very Good', color: 'blue' },
  EXCELLENT: { min: 800, max: 850, label: 'Excellent', color: 'green' },
} as const

// ===================================
// Credit Bureaus
// ===================================
export const CREDIT_BUREAUS = {
  EXPERIAN: 'experian',
  EQUIFAX: 'equifax',
  TRANSUNION: 'transunion',
} as const

export const BUREAU_INFO = {
  [CREDIT_BUREAUS.EXPERIAN]: {
    name: 'Experian',
    website: 'https://www.experian.com',
    phone: '1-888-397-3742',
    address: 'P.O. Box 4500, Allen, TX 75013',
  },
  [CREDIT_BUREAUS.EQUIFAX]: {
    name: 'Equifax',
    website: 'https://www.equifax.com',
    phone: '1-800-685-1111',
    address: 'P.O. Box 740241, Atlanta, GA 30374',
  },
  [CREDIT_BUREAUS.TRANSUNION]: {
    name: 'TransUnion',
    website: 'https://www.transunion.com',
    phone: '1-800-916-8800',
    address: 'P.O. Box 2000, Chester, PA 19016',
  },
} as const

// ===================================
// Dispute Statuses
// ===================================
export const DISPUTE_STATUSES = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  SENT: 'sent',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
} as const

export const DISPUTE_STATUS_LABELS = {
  [DISPUTE_STATUSES.DRAFT]: 'Draft',
  [DISPUTE_STATUSES.PENDING_REVIEW]: 'Pending Review',
  [DISPUTE_STATUSES.SENT]: 'Sent',
  [DISPUTE_STATUSES.IN_PROGRESS]: 'In Progress',
  [DISPUTE_STATUSES.RESOLVED]: 'Resolved',
  [DISPUTE_STATUSES.REJECTED]: 'Rejected',
  [DISPUTE_STATUSES.ESCALATED]: 'Escalated',
} as const

// ===================================
// Violation Types
// ===================================
export const VIOLATION_TYPES = {
  INACCURATE_PERSONAL_INFO: 'inaccurate_personal_info',
  DUPLICATE_ACCOUNTS: 'duplicate_accounts',
  OUTDATED_INFORMATION: 'outdated_information',
  UNAUTHORIZED_INQUIRIES: 'unauthorized_inquiries',
  INCORRECT_PAYMENT_HISTORY: 'incorrect_payment_history',
  IDENTITY_THEFT: 'identity_theft',
  MIXED_FILES: 'mixed_files',
  OBSOLETE_INFORMATION: 'obsolete_information',
} as const

export const VIOLATION_TYPE_LABELS = {
  [VIOLATION_TYPES.INACCURATE_PERSONAL_INFO]: 'Inaccurate Personal Information',
  [VIOLATION_TYPES.DUPLICATE_ACCOUNTS]: 'Duplicate Accounts',
  [VIOLATION_TYPES.OUTDATED_INFORMATION]: 'Outdated Information',
  [VIOLATION_TYPES.UNAUTHORIZED_INQUIRIES]: 'Unauthorized Inquiries',
  [VIOLATION_TYPES.INCORRECT_PAYMENT_HISTORY]: 'Incorrect Payment History',
  [VIOLATION_TYPES.IDENTITY_THEFT]: 'Identity Theft',
  [VIOLATION_TYPES.MIXED_FILES]: 'Mixed Files',
  [VIOLATION_TYPES.OBSOLETE_INFORMATION]: 'Obsolete Information',
} as const

// ===================================
// File Upload Configuration
// ===================================
export const FILE_UPLOAD = {
  maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  maxFiles: parseInt(process.env.MAX_FILES_PER_UPLOAD || '5'),
  allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png,doc,docx,txt').split(','),
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
} as const

// ===================================
// Validation Rules
// ===================================
export const VALIDATION = {
  email: {
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
  phone: {
    pattern: /^(\+?1-?)?(\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/,
  },
  ssn: {
    pattern: /^(?!666|000|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0{4})\d{4}$/,
  },
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
  },
  zipCode: {
    pattern: /^\d{5}(-\d{4})?$/,
  },
} as const

// ===================================
// Rate Limiting
// ===================================
export const RATE_LIMITS = {
  default: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  auth: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
  },
  upload: {
    window: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
  },
} as const

// ===================================
// Cache Configuration
// ===================================
export const CACHE = {
  ttl: {
    short: 5 * 60, // 5 minutes
    medium: 30 * 60, // 30 minutes
    long: 60 * 60, // 1 hour
    day: 24 * 60 * 60, // 24 hours
  },
  keys: {
    userProfile: (userId: string) => `user:profile:${userId}`,
    creditScore: (userId: string) => `credit:score:${userId}`,
    disputes: (userId: string) => `disputes:${userId}`,
    reports: (userId: string) => `reports:${userId}`,
  },
} as const

// ===================================
// Error Messages
// ===================================
export const ERROR_MESSAGES = {
  // Generic errors
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection and try again.',
  TIMEOUT: 'Request timeout. Please try again.',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_LOCKED: 'Account temporarily locked. Please try again later.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address.',
  WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
  
  // Validation errors
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  INVALID_SSN: 'Please enter a valid SSN.',
  INVALID_ZIP: 'Please enter a valid ZIP code.',
  
  // File upload errors
  FILE_TOO_LARGE: `File size must be less than ${FILE_UPLOAD.maxSize / 1024 / 1024}MB.`,
  INVALID_FILE_TYPE: `Only ${FILE_UPLOAD.allowedTypes.join(', ')} files are allowed.`,
  TOO_MANY_FILES: `Maximum ${FILE_UPLOAD.maxFiles} files allowed.`,
  
  // Business logic errors
  SUBSCRIPTION_REQUIRED: 'This feature requires a subscription upgrade.',
  LIMIT_EXCEEDED: 'You have reached your plan limit.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
} as const

// ===================================
// Success Messages
// ===================================
export const SUCCESS_MESSAGES = {
  ACCOUNT_CREATED: 'Account created successfully! Please check your email to verify your account.',
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'You have been logged out successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  DISPUTE_CREATED: 'Dispute created successfully.',
  DISPUTE_UPDATED: 'Dispute updated successfully.',
  DOCUMENT_UPLOADED: 'Document uploaded successfully.',
  PASSWORD_RESET: 'Password reset link sent to your email.',
  EMAIL_VERIFIED: 'Email verified successfully.',
} as const

// ===================================
// UI Constants
// ===================================
export const UI = {
  breakpoints: {
    xs: 475,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
    '3xl': 1920,
  },
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    backdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const

// ===================================
// Analytics Events
// ===================================
export const ANALYTICS_EVENTS = {
  // User actions
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  
  // Credit actions
  CREDIT_REPORT_VIEWED: 'credit_report_viewed',
  CREDIT_SCORE_CHECKED: 'credit_score_checked',
  DISPUTE_CREATED: 'dispute_created',
  DISPUTE_SENT: 'dispute_sent',
  
  // Business actions
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  DOCUMENT_UPLOADED: 'document_uploaded',
  
  // Engagement
  PAGE_VIEW: 'page_view',
  FEATURE_USED: 'feature_used',
  HELP_ACCESSED: 'help_accessed',
} as const

// ===================================
// Contact Information
// ===================================
export const CONTACT_INFO = {
  email: 'support@creditai.com',
  phone: '+1 (555) 123-4567',
  address: '123 Finance St, Credit City, CC 12345',
  hours: 'Monday - Friday: 9:00 AM - 6:00 PM EST',
} as const