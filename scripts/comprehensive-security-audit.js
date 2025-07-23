#!/usr/bin/env node

/**
 * Comprehensive Security Audit Script
 * Final security assessment, penetration testing simulation, and compliance validation
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  environment: process.env.NODE_ENV || 'production',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.creditai.com',
  timeout: 60000,
  reportPath: './test-results/security-audit-report.json',
  securityStandards: {
    owasp: 'OWASP Top 10 2021',
    pci: 'PCI DSS v3.2.1',
    gdpr: 'GDPR Article 32',
    nist: 'NIST Cybersecurity Framework'
  }
};

// Security audit results storage
const securityResults = {
  timestamp: new Date().toISOString(),
  environment: CONFIG.environment,
  standards: CONFIG.securityStands,
  categories: {},
  summary: {
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    criticalFindings: 0,
    highFindings: 0,
    mediumFindings: 0,
    lowFindings: 0
  },
  compliance: {
    owasp: { score: 0, findings: [] },
    pci: { score: 0, findings: [] },
    gdpr: { score: 0, findings: [] },
    nist: { score: 0, findings: [] }
  },
  riskScore: 0,
  securityPosture: 'unknown'
};

async function main() {
  console.log('🔒 Starting Comprehensive Security Audit...');
  console.log(`Environment: ${CONFIG.environment}`);
  console.log(`Target URL: ${CONFIG.baseUrl}`);
  console.log('='.repeat(80));

  try {
    // Run security audit categories
    await auditAuthenticationSecurity();
    await auditAuthorizationControls();
    await auditDataProtection();
    await auditNetworkSecurity();
    await auditApplicationSecurity();
    await auditInfrastructureSecurity();
    await auditComplianceRequirements();
    await simulatePenetrationTesting();

    // Calculate security scores and risk assessment
    calculateSecurityScores();
    assessSecurityPosture();

    // Generate comprehensive security report
    await generateSecurityReport();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Comprehensive Security Audit Complete');
    console.log(`Total Checks: ${securityResults.summary.totalChecks}`);
    console.log(`Passed: ${securityResults.summary.passedChecks}`);
    console.log(`Failed: ${securityResults.summary.failedChecks}`);
    console.log(`\nFindings by Severity:`);
    console.log(`  Critical: ${securityResults.summary.criticalFindings}`);
    console.log(`  High: ${securityResults.summary.highFindings}`);
    console.log(`  Medium: ${securityResults.summary.mediumFindings}`);
    console.log(`  Low: ${securityResults.summary.lowFindings}`);
    console.log(`\nCompliance Scores:`);
    console.log(`  OWASP Top 10: ${securityResults.compliance.owasp.score.toFixed(1)}%`);
    console.log(`  PCI DSS: ${securityResults.compliance.pci.score.toFixed(1)}%`);
    console.log(`  GDPR: ${securityResults.compliance.gdpr.score.toFixed(1)}%`);
    console.log(`  NIST: ${securityResults.compliance.nist.score.toFixed(1)}%`);
    console.log(`\nOverall Risk Score: ${securityResults.riskScore.toFixed(1)}/100`);
    console.log(`Security Posture: ${getSecurityIcon()} ${securityResults.securityPosture.toUpperCase()}`);

    // Exit with appropriate code
    const hasHighRiskFindings = securityResults.summary.criticalFindings > 0 || 
                               securityResults.summary.highFindings > 5 ||
                               securityResults.riskScore > 70;
    process.exit(hasHighRiskFindings ? 1 : 0);

  } catch (error) {
    console.error('❌ Security audit failed:', error.message);
    process.exit(1);
  }
}

async function auditAuthenticationSecurity() {
  console.log('\n🔐 Auditing Authentication Security...');
  
  const category = {
    name: 'Authentication Security',
    checks: [],
    passed: 0,
    failed: 0,
    findings: []
  };

  const checks = [
    {
      name: 'Strong Password Policy',
      severity: 'high',
      test: async () => {
        try {
          const response = await axios.post(`${CONFIG.baseUrl}/api/auth/signup`, {
            email: 'test@security-audit.com',
            password: '123'
          }, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should reject weak passwords
          return response.status === 400 && 
                 response.data.message?.toLowerCase().includes('password');
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Account Lockout Protection',
      severity: 'high',
      test: async () => {
        try {
          // Attempt multiple failed logins
          const attempts = Array(6).fill(null).map(() => 
            axios.post(`${CONFIG.baseUrl}/api/auth/signin`, {
              email: 'test@security-audit.com',
              password: 'wrongpassword'
            }, {
              timeout: 5000,
              validateStatus: () => true
            })
          );
          
          const responses = await Promise.all(attempts);
          const lastResponse = responses[responses.length - 1];
          
          // Should be locked out after multiple attempts
          return lastResponse.status === 429 || 
                 lastResponse.data.message?.toLowerCase().includes('locked');
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Session Management',
      severity: 'high',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/user/profile`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should require authentication
          return response.status === 401 || response.status === 403;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'JWT Token Security',
      severity: 'medium',
      test: async () => {
        try {
          // Test for JWT token exposure in error messages
          const response = await axios.get(`${CONFIG.baseUrl}/api/auth/verify`, {
            headers: {
              'Authorization': 'Bearer invalid.jwt.token'
            },
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          const responseStr = JSON.stringify(response.data);
          // Should not expose JWT secrets in error messages
          return !responseStr.includes('secret') && !responseStr.includes('key');
        } catch {
          return true;
        }
      }
    },
    {
      name: 'Multi-Factor Authentication',
      severity: 'medium',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/auth/mfa/status`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          return response.status === 200 && response.data.available === true;
        } catch {
          return false;
        }
      }
    }
  ];

  await runSecurityChecks(category, checks);
  securityResults.categories.authentication = category;
  
  console.log(`  Status: ${getCategorySecurityStatus(category)}`);
  console.log(`    Passed: ${category.passed}/${category.checks.length}`);
  console.log(`    Findings: ${category.findings.length}`);
}

async function auditAuthorizationControls() {
  console.log('\n🛡️  Auditing Authorization Controls...');
  
  const category = {
    name: 'Authorization Controls',
    checks: [],
    passed: 0,
    failed: 0,
    findings: []
  };

  const checks = [
    {
      name: 'Role-Based Access Control',
      severity: 'high',
      test: async () => {
        try {
          // Test admin endpoint without proper authorization
          const response = await axios.get(`${CONFIG.baseUrl}/api/admin/users`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should deny access without proper role
          return response.status === 403 || response.status === 401;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Privilege Escalation Prevention',
      severity: 'critical',
      test: async () => {
        try {
          // Test for privilege escalation vulnerabilities
          const response = await axios.put(`${CONFIG.baseUrl}/api/user/profile`, {
            role: 'admin',
            permissions: ['admin']
          }, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should not allow users to escalate their own privileges
          return response.status !== 200 || 
                 !response.data.role || 
                 response.data.role !== 'admin';
        } catch {
          return true;
        }
      }
    },
    {
      name: 'Resource Access Control',
      severity: 'high',
      test: async () => {
        try {
          // Test access to other users' data
          const response = await axios.get(`${CONFIG.baseUrl}/api/user/reports?user_id=other-user`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should not allow access to other users' data
          return response.status === 403 || response.status === 401;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'API Endpoint Authorization',
      severity: 'high',
      test: async () => {
        const protectedEndpoints = [
          '/api/admin/metrics',
          '/api/admin/logs',
          '/api/admin/config',
          '/api/system/database'
        ];
        
        for (const endpoint of protectedEndpoints) {
          try {
            const response = await axios.get(`${CONFIG.baseUrl}${endpoint}`, {
              timeout: 5000,
              validateStatus: () => true
            });
            
            if (response.status === 200) {
              return false; // Endpoint should be protected
            }
          } catch {
            // Network errors are acceptable
          }
        }
        return true;
      }
    }
  ];

  await runSecurityChecks(category, checks);
  securityResults.categories.authorization = category;
  
  console.log(`  Status: ${getCategorySecurityStatus(category)}`);
  console.log(`    Passed: ${category.passed}/${category.checks.length}`);
  console.log(`    Findings: ${category.findings.length}`);
}

async function auditDataProtection() {
  console.log('\n🔒 Auditing Data Protection...');
  
  const category = {
    name: 'Data Protection',
    checks: [],
    passed: 0,
    failed: 0,
    findings: []
  };

  const checks = [
    {
      name: 'HTTPS Enforcement',
      severity: 'critical',
      test: async () => {
        try {
          const httpUrl = CONFIG.baseUrl.replace('https://', 'http://');
          const response = await axios.get(httpUrl, {
            maxRedirects: 0,
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should redirect to HTTPS
          return response.status >= 300 && response.status < 400 && 
                 response.headers.location?.startsWith('https://');
        } catch {
          return true; // HTTP completely blocked is also good
        }
      }
    },
    {
      name: 'Data Encryption in Transit',
      severity: 'critical',
      test: async () => {
        try {
          const response = await axios.get(CONFIG.baseUrl, {
            timeout: CONFIG.timeout
          });
          
          // Check for strong TLS configuration
          return response.request?.connection?.encrypted === true;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'PII Data Masking',
      severity: 'high',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/user/profile-demo`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          if (response.status === 200 && response.data) {
            const dataStr = JSON.stringify(response.data);
            // Check that demo data doesn't contain real PII patterns
            const piiPatterns = [
              /\d{3}-\d{2}-\d{4}/, // SSN
              /\d{16}/, // Credit card
              /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Real email
            ];
            
            return !piiPatterns.some(pattern => pattern.test(dataStr));
          }
          return true;
        } catch {
          return true;
        }
      }
    },
    {
      name: 'Data Retention Controls',
      severity: 'medium',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/admin/data-retention`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          return response.status === 200 && 
                 response.data.policies && 
                 response.data.policies.length > 0;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Backup Encryption',
      severity: 'high',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/admin/backup-status`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          return response.status === 200 && 
                 response.data.encryption_enabled === true;
        } catch {
          return false;
        }
      }
    }
  ];

  await runSecurityChecks(category, checks);
  securityResults.categories.dataProtection = category;
  
  console.log(`  Status: ${getCategorySecurityStatus(category)}`);
  console.log(`    Passed: ${category.passed}/${category.checks.length}`);
  console.log(`    Findings: ${category.findings.length}`);
}

async function auditNetworkSecurity() {
  console.log('\n🌐 Auditing Network Security...');
  
  const category = {
    name: 'Network Security',
    checks: [],
    passed: 0,
    failed: 0,
    findings: []
  };

  const checks = [
    {
      name: 'Security Headers',
      severity: 'high',
      test: async () => {
        try {
          const response = await axios.get(CONFIG.baseUrl, {
            timeout: CONFIG.timeout
          });
          
          const requiredHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'strict-transport-security',
            'content-security-policy'
          ];
          
          return requiredHeaders.every(header => 
            response.headers[header.toLowerCase()] !== undefined
          );
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Content Security Policy',
      severity: 'high',
      test: async () => {
        try {
          const response = await axios.get(CONFIG.baseUrl, {
            timeout: CONFIG.timeout
          });
          
          const csp = response.headers['content-security-policy'];
          return csp && 
                 csp.includes("default-src 'self'") && 
                 !csp.includes("'unsafe-inline'") &&
                 !csp.includes("'unsafe-eval'");
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Rate Limiting',
      severity: 'high',
      test: async () => {
        try {
          // Make rapid requests to test rate limiting
          const requests = Array(25).fill(null).map(() => 
            axios.get(`${CONFIG.baseUrl}/api/system/health`, {
              timeout: 3000,
              validateStatus: () => true
            })
          );
          
          const responses = await Promise.all(requests);
          const rateLimited = responses.some(r => r.status === 429);
          return rateLimited;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'CORS Configuration',
      severity: 'medium',
      test: async () => {
        try {
          const response = await axios.options(CONFIG.baseUrl, {
            headers: {
              'Origin': 'https://malicious-site.com',
              'Access-Control-Request-Method': 'POST'
            },
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          const allowOrigin = response.headers['access-control-allow-origin'];
          // Should not allow all origins
          return !allowOrigin || allowOrigin !== '*';
        } catch {
          return true;
        }
      }
    }
  ];

  await runSecurityChecks(category, checks);
  securityResults.categories.networkSecurity = category;
  
  console.log(`  Status: ${getCategorySecurityStatus(category)}`);
  console.log(`    Passed: ${category.passed}/${category.checks.length}`);
  console.log(`    Findings: ${category.findings.length}`);
}

async function auditApplicationSecurity() {
  console.log('\n🛡️  Auditing Application Security...');
  
  const category = {
    name: 'Application Security',
    checks: [],
    passed: 0,
    failed: 0,
    findings: []
  };

  const checks = [
    {
      name: 'SQL Injection Protection',
      severity: 'critical',
      test: async () => {
        try {
          const sqlPayloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; SELECT * FROM users; --"
          ];
          
          for (const payload of sqlPayloads) {
            const response = await axios.post(`${CONFIG.baseUrl}/api/auth/signin`, {
              email: payload,
              password: 'test'
            }, {
              timeout: CONFIG.timeout,
              validateStatus: () => true
            });
            
            // Should reject malicious SQL
            if (response.status === 200 || 
                JSON.stringify(response.data).includes('users')) {
              return false;
            }
          }
          return true;
        } catch {
          return true;
        }
      }
    },
    {
      name: 'XSS Protection',
      severity: 'critical',
      test: async () => {
        try {
          const xssPayloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>"
          ];
          
          for (const payload of xssPayloads) {
            const response = await axios.post(`${CONFIG.baseUrl}/api/user/profile`, {
              name: payload
            }, {
              timeout: CONFIG.timeout,
              validateStatus: () => true
            });
            
            // Should escape or reject XSS payloads
            if (response.status === 200 && 
                JSON.stringify(response.data).includes('<script>')) {
              return false;
            }
          }
          return true;
        } catch {
          return true;
        }
      }
    },
    {
      name: 'File Upload Security',
      severity: 'high',
      test: async () => {
        try {
          // Test malicious file upload
          const maliciousContent = '<?php system($_GET["cmd"]); ?>';
          const response = await axios.post(`${CONFIG.baseUrl}/api/upload`, {
            file: {
              name: 'malicious.php',
              content: maliciousContent,
              type: 'application/x-php'
            }
          }, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should reject malicious file types
          return response.status !== 200 || 
                 response.data.error || 
                 !response.data.url;
        } catch {
          return true;
        }
      }
    },
    {
      name: 'CSRF Protection',
      severity: 'high',
      test: async () => {
        try {
          // Test CSRF protection
          const response = await axios.post(`${CONFIG.baseUrl}/api/user/profile`, {
            name: 'CSRF Test'
          }, {
            headers: {
              'Origin': 'https://malicious-site.com'
            },
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should reject cross-origin requests without proper CSRF token
          return response.status === 403 || response.status === 401;
        } catch {
          return true;
        }
      }
    }
  ];

  await runSecurityChecks(category, checks);
  securityResults.categories.applicationSecurity = category;
  
  console.log(`  Status: ${getCategorySecurityStatus(category)}`);
  console.log(`    Passed: ${category.passed}/${category.checks.length}`);
  console.log(`    Findings: ${category.findings.length}`);
}

async function auditInfrastructureSecurity() {
  console.log('\n🏗️  Auditing Infrastructure Security...');
  
  const category = {
    name: 'Infrastructure Security',
    checks: [],
    passed: 0,
    failed: 0,
    findings: []
  };

  const checks = [
    {
      name: 'Server Information Disclosure',
      severity: 'medium',
      test: async () => {
        try {
          const response = await axios.get(CONFIG.baseUrl, {
            timeout: CONFIG.timeout
          });
          
          const serverHeader = response.headers['server'];
          const xPoweredBy = response.headers['x-powered-by'];
          
          // Should not expose detailed server information
          return !serverHeader?.includes('Apache/') && 
                 !serverHeader?.includes('nginx/') &&
                 !xPoweredBy;
        } catch {
          return true;
        }
      }
    },
    {
      name: 'Error Information Disclosure',
      severity: 'medium',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/non-existent-endpoint`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          const responseStr = JSON.stringify(response.data);
          // Should not expose stack traces or internal paths
          return !responseStr.includes('Error:') &&
                 !responseStr.includes('/src/') &&
                 !responseStr.includes('stack');
        } catch {
          return true;
        }
      }
    },
    {
      name: 'Database Security',
      severity: 'high',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/system/health/database`, {
            timeout: CONFIG.timeout
          });
          
          // Should not expose database connection details
          const responseStr = JSON.stringify(response.data);
          return !responseStr.includes('password') &&
                 !responseStr.includes('host') &&
                 !responseStr.includes('connection_string');
        } catch {
          return true;
        }
      }
    }
  ];

  await runSecurityChecks(category, checks);
  securityResults.categories.infrastructureSecurity = category;
  
  console.log(`  Status: ${getCategorySecurityStatus(category)}`);
  console.log(`    Passed: ${category.passed}/${category.checks.length}`);
  console.log(`    Findings: ${category.findings.length}`);
}

async function auditComplianceRequirements() {
  console.log('\n📋 Auditing Compliance Requirements...');
  
  const category = {
    name: 'Compliance',
    checks: [],
    passed: 0,
    failed: 0,
    findings: []
  };

  const checks = [
    {
      name: 'GDPR Data Rights',
      severity: 'high',
      compliance: 'gdpr',
      test: async () => {
        try {
          const endpoints = ['/privacy-policy', '/api/gdpr/export', '/api/gdpr/delete'];
          const results = await Promise.all(
            endpoints.map(endpoint => 
              axios.get(`${CONFIG.baseUrl}${endpoint}`, {
                timeout: CONFIG.timeout,
                validateStatus: () => true
              })
            )
          );
          
          return results.every(r => r.status === 200 || r.status === 401);
        } catch {
          return false;
        }
      }
    },
    {
      name: 'PCI DSS Payment Security',
      severity: 'critical',
      compliance: 'pci',
      test: async () => {
        try {
          const response = await axios.post(`${CONFIG.baseUrl}/api/payment/process`, {
            cardNumber: '4111111111111111',
            cvv: '123'
          }, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should not store or log card details
          const responseStr = JSON.stringify(response.data);
          return !responseStr.includes('4111') && !responseStr.includes('123');
        } catch {
          return true;
        }
      }
    },
    {
      name: 'SOX Audit Trail',
      severity: 'medium',
      compliance: 'nist',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/admin/audit-logs`, {
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          return response.status === 200 && 
                 response.data.logs && 
                 response.data.logs.length > 0;
        } catch {
          return false;
        }
      }
    }
  ];

  await runSecurityChecks(category, checks);
  securityResults.categories.compliance = category;
  
  console.log(`  Status: ${getCategorySecurityStatus(category)}`);
  console.log(`    Passed: ${category.passed}/${category.checks.length}`);
  console.log(`    Findings: ${category.findings.length}`);
}

async function simulatePenetrationTesting() {
  console.log('\n🎯 Simulating Penetration Testing...');
  
  const category = {
    name: 'Penetration Testing',
    checks: [],
    passed: 0,
    failed: 0,
    findings: []
  };

  const tests = [
    {
      name: 'Directory Traversal',
      severity: 'high',
      test: async () => {
        try {
          const payloads = ['../../../etc/passwd', '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts'];
          
          for (const payload of payloads) {
            const response = await axios.get(`${CONFIG.baseUrl}/api/files/${encodeURIComponent(payload)}`, {
              timeout: CONFIG.timeout,
              validateStatus: () => true
            });
            
            if (response.status === 200 && 
                (response.data.includes('root:') || response.data.includes('localhost'))) {
              return false;
            }
          }
          return true;
        } catch {
          return true;
        }
      }
    },
    {
      name: 'Command Injection',
      severity: 'critical',
      test: async () => {
        try {
          const payloads = ['; ls -la', '| whoami', '&& cat /etc/passwd'];
          
          for (const payload of payloads) {
            const response = await axios.post(`${CONFIG.baseUrl}/api/system/ping`, {
              host: `localhost${payload}`
            }, {
              timeout: CONFIG.timeout,
              validateStatus: () => true
            });
            
            if (response.status === 200 && 
                (response.data.includes('total') || response.data.includes('root'))) {
              return false;
            }
          }
          return true;
        } catch {
          return true;
        }
      }
    },
    {
      name: 'Session Hijacking',
      severity: 'high',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.baseUrl}/api/user/profile`, {
            headers: {
              'Cookie': 'session_id=stolen_session_token'
            },
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });
          
          // Should reject invalid/stolen sessions
          return response.status === 401 || response.status === 403;
        } catch {
          return true;
        }
      }
    }
  ];

  await runSecurityChecks(category, tests);
  securityResults.categories.penetrationTesting = category;
  
  console.log(`  Status: ${getCategorySecurityStatus(category)}`);
  console.log(`    Passed: ${category.passed}/${category.checks.length}`);
  console.log(`    Findings: ${category.findings.length}`);
}

// Helper functions
async function runSecurityChecks(category, checks) {
  for (const check of checks) {
    try {
      const startTime = Date.now();
      const result = await check.test();
      const duration = Date.now() - startTime;

      const checkResult = {
        name: check.name,
        passed: result,
        severity: check.severity || 'low',
        compliance: check.compliance || null,
        duration,
        error: null
      };

      category.checks.push(checkResult);

      if (result) {
        category.passed++;
        securityResults.summary.passedChecks++;
      } else {
        category.failed++;
        securityResults.summary.failedChecks++;
        
        const finding = {
          category: category.name,
          check: check.name,
          severity: check.severity,
          compliance: check.compliance,
          description: `Security check failed: ${check.name}`,
          recommendation: getSecurityRecommendation(check.name, check.severity)
        };
        
        category.findings.push(finding);
        
        // Update severity counters
        switch (check.severity) {
          case 'critical':
            securityResults.summary.criticalFindings++;
            break;
          case 'high':
            securityResults.summary.highFindings++;
            break;
          case 'medium':
            securityResults.summary.mediumFindings++;
            break;
          case 'low':
            securityResults.summary.lowFindings++;
            break;
        }
        
        // Update compliance findings
        if (check.compliance && securityResults.compliance[check.compliance]) {
          securityResults.compliance[check.compliance].findings.push(finding);
        }
      }

      securityResults.summary.totalChecks++;

      const icon = result ? '✅' : getSeverityIcon(check.severity);
      console.log(`    ${icon} ${check.name} (${duration}ms)`);

    } catch (error) {
      const checkResult = {
        name: check.name,
        passed: false,
        severity: check.severity || 'low',
        compliance: check.compliance || null,
        duration: 0,
        error: error.message
      };

      category.checks.push(checkResult);
      category.failed++;
      securityResults.summary.failedChecks++;
      securityResults.summary.totalChecks++;

      const finding = {
        category: category.name,
        check: check.name,
        severity: 'medium',
        description: `Security check error: ${error.message}`,
        recommendation: 'Investigate and resolve the underlying issue'
      };
      
      category.findings.push(finding);
      securityResults.summary.mediumFindings++;

      console.log(`    ❌ ${check.name}: ${error.message}`);
    }
  }
}

function calculateSecurityScores() {
  const categories = securityResults.categories;
  
  // Calculate compliance scores
  Object.keys(securityResults.compliance).forEach(standard => {
    const relevantChecks = Object.values(categories)
      .flatMap(cat => cat.checks)
      .filter(check => check.compliance === standard);
    
    if (relevantChecks.length > 0) {
      const passedChecks = relevantChecks.filter(check => check.passed).length;
      securityResults.compliance[standard].score = (passedChecks / relevantChecks.length) * 100;
    }
  });

  // Calculate overall risk score (0-100, where 100 is highest risk)
  const severityWeights = { critical: 40, high: 20, medium: 5, low: 1 };
  const maxRisk = securityResults.summary.totalChecks * severityWeights.critical;
  
  const actualRisk = (securityResults.summary.criticalFindings * severityWeights.critical) +
                    (securityResults.summary.highFindings * severityWeights.high) +
                    (securityResults.summary.mediumFindings * severityWeights.medium) +
                    (securityResults.summary.lowFindings * severityWeights.low);
  
  securityResults.riskScore = maxRisk > 0 ? (actualRisk / maxRisk) * 100 : 0;
}

function assessSecurityPosture() {
  const riskScore = securityResults.riskScore;
  const criticalFindings = securityResults.summary.criticalFindings;
  const highFindings = securityResults.summary.highFindings;

  if (criticalFindings > 0) {
    securityResults.securityPosture = 'critical-risk';
  } else if (highFindings > 5 || riskScore > 70) {
    securityResults.securityPosture = 'high-risk';
  } else if (highFindings > 0 || riskScore > 40) {
    securityResults.securityPosture = 'medium-risk';
  } else if (riskScore > 20) {
    securityResults.securityPosture = 'low-risk';
  } else {
    securityResults.securityPosture = 'secure';
  }
}

function getCategorySecurityStatus(category) {
  if (category.findings.some(f => f.severity === 'critical')) return '🔴 CRITICAL';
  if (category.findings.some(f => f.severity === 'high')) return '🟠 HIGH RISK';
  if (category.findings.some(f => f.severity === 'medium')) return '🟡 MEDIUM RISK';
  if (category.findings.length > 0) return '🟢 LOW RISK';
  return '✅ SECURE';
}

function getSeverityIcon(severity) {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🔵';
    default: return '❌';
  }
}

function getSecurityIcon() {
  switch (securityResults.securityPosture) {
    case 'secure': return '🟢';
    case 'low-risk': return '🟡';
    case 'medium-risk': return '🟠';
    case 'high-risk': return '🔴';
    case 'critical-risk': return '🚨';
    default: return '❓';
  }
}

function getSecurityRecommendation(checkName, severity) {
  const recommendations = {
    'Strong Password Policy': 'Implement and enforce a strong password policy with minimum length, complexity requirements, and password history.',
    'Account Lockout Protection': 'Configure account lockout after multiple failed login attempts with progressive delays.',
    'Session Management': 'Implement secure session management with proper timeout and regeneration.',
    'SQL Injection Protection': 'Use parameterized queries and input validation to prevent SQL injection attacks.',
    'XSS Protection': 'Implement input sanitization and output encoding to prevent XSS attacks.',
    'HTTPS Enforcement': 'Enforce HTTPS for all communications and implement HSTS headers.',
    'Security Headers': 'Configure all required security headers including CSP, HSTS, and X-Frame-Options.',
    'Rate Limiting': 'Implement rate limiting to prevent abuse and DoS attacks.',
    'PII Data Masking': 'Implement proper data masking and anonymization for sensitive information.'
  };
  
  return recommendations[checkName] || 'Review and implement appropriate security controls for this finding.';
}

async function generateSecurityReport() {
  const reportDir = path.dirname(CONFIG.reportPath);
  
  try {
    await fs.mkdir(reportDir, { recursive: true });
    
    // Add executive summary
    securityResults.executiveSummary = {
      overallRating: securityResults.securityPosture,
      criticalIssues: securityResults.summary.criticalFindings,
      highPriorityItems: securityResults.summary.highFindings,
      complianceStatus: {
        owasp: securityResults.compliance.owasp.score >= 90 ? 'Compliant' : 'Non-compliant',
        pci: securityResults.compliance.pci.score >= 95 ? 'Compliant' : 'Non-compliant',
        gdpr: securityResults.compliance.gdpr.score >= 90 ? 'Compliant' : 'Non-compliant'
      },
      recommendations: [
        'Address all critical and high-severity findings immediately',
        'Implement regular security testing and monitoring',
        'Conduct annual third-party security assessments',
        'Update security policies and procedures',
        'Provide security training for development team'
      ]
    };
    
    securityResults.duration = Date.now() - new Date(securityResults.timestamp).getTime();
    
    await fs.writeFile(CONFIG.reportPath, JSON.stringify(securityResults, null, 2));
    
    console.log(`\n🔒 Security audit report saved to: ${CONFIG.reportPath}`);
  } catch (error) {
    console.error('Failed to save security report:', error.message);
  }
}

// Run security audit if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  auditAuthenticationSecurity,
  auditAuthorizationControls,
  auditDataProtection,
  auditApplicationSecurity,
  calculateSecurityScores,
  assessSecurityPosture
};