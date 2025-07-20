#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Routes to test
const ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/upload', name: 'Upload' },
  { path: '/analysis-results', name: 'Analysis Results' },
  { path: '/login', name: 'Login' },
];

// Simple performance test
async function measureRoute(url) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    let firstByteTime = 0;
    let totalSize = 0;
    
    const request = http.get(url, (response) => {
      if (!firstByteTime) {
        firstByteTime = performance.now() - startTime;
      }
      
      response.on('data', (chunk) => {
        totalSize += chunk.length;
      });
      
      response.on('end', () => {
        const totalTime = performance.now() - startTime;
        resolve({
          statusCode: response.statusCode,
          firstByteTime,
          totalTime,
          totalSize,
          headers: response.headers,
        });
      });
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runPerformanceCheck() {
  console.log('🚀 Running performance check...\n');
  
  const results = [];
  const timestamp = new Date().toISOString();
  
  // Test each route
  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    console.log(`📊 Testing ${route.name} (${url})...`);
    
    try {
      // Run 3 tests and average
      const measurements = [];
      for (let i = 0; i < 3; i++) {
        const result = await measureRoute(url);
        measurements.push(result);
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Calculate averages
      const avgFirstByte = measurements.reduce((sum, m) => sum + m.firstByteTime, 0) / measurements.length;
      const avgTotalTime = measurements.reduce((sum, m) => sum + m.totalTime, 0) / measurements.length;
      const avgSize = measurements.reduce((sum, m) => sum + m.totalSize, 0) / measurements.length;
      
      const result = {
        route: route.name,
        path: route.path,
        metrics: {
          firstByteTime: Math.round(avgFirstByte),
          totalTime: Math.round(avgTotalTime),
          sizeKB: Math.round(avgSize / 1024 * 10) / 10,
        },
        performance: getPerformanceRating(avgFirstByte, avgTotalTime, avgSize),
      };
      
      results.push(result);
      
      // Print results
      const emoji = result.performance.rating === 'good' ? '✅' : 
                   result.performance.rating === 'moderate' ? '⚠️' : '❌';
      
      console.log(`${emoji} ${route.name}:`);
      console.log(`   - First Byte: ${result.metrics.firstByteTime}ms`);
      console.log(`   - Total Time: ${result.metrics.totalTime}ms`);
      console.log(`   - Size: ${result.metrics.sizeKB}KB`);
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error testing ${route.name}:`, error.message);
      results.push({
        route: route.name,
        path: route.path,
        error: error.message,
      });
    }
  }
  
  // Generate summary
  console.log('\n📋 Performance Summary:');
  console.log('========================\n');
  
  const successfulResults = results.filter(r => !r.error);
  
  if (successfulResults.length > 0) {
    // Calculate averages
    const avgFirstByte = Math.round(
      successfulResults.reduce((sum, r) => sum + r.metrics.firstByteTime, 0) / successfulResults.length
    );
    const avgTotalTime = Math.round(
      successfulResults.reduce((sum, r) => sum + r.metrics.totalTime, 0) / successfulResults.length
    );
    const avgSize = Math.round(
      successfulResults.reduce((sum, r) => sum + r.metrics.sizeKB, 0) / successfulResults.length * 10
    ) / 10;
    
    console.log(`Average First Byte Time: ${avgFirstByte}ms`);
    console.log(`Average Total Load Time: ${avgTotalTime}ms`);
    console.log(`Average Page Size: ${avgSize}KB`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    const recommendations = generateRecommendations(results);
    if (recommendations.length > 0) {
      recommendations.forEach(rec => console.log(`   - ${rec}`));
    } else {
      console.log('   ✅ All pages are performing well!');
    }
  }
  
  // Save report
  const report = {
    timestamp,
    baseUrl: BASE_URL,
    results,
    summary: {
      totalRoutes: results.length,
      successfulTests: successfulResults.length,
      avgMetrics: successfulResults.length > 0 ? {
        firstByteTime: Math.round(
          successfulResults.reduce((sum, r) => sum + r.metrics.firstByteTime, 0) / successfulResults.length
        ),
        totalTime: Math.round(
          successfulResults.reduce((sum, r) => sum + r.metrics.totalTime, 0) / successfulResults.length
        ),
        sizeKB: Math.round(
          successfulResults.reduce((sum, r) => sum + r.metrics.sizeKB, 0) / successfulResults.length * 10
        ) / 10,
      } : null,
    },
  };
  
  const reportPath = path.join(__dirname, '../performance-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

function getPerformanceRating(firstByte, totalTime, size) {
  let score = 100;
  let issues = [];
  
  // First byte time scoring
  if (firstByte > 600) {
    score -= 30;
    issues.push('Slow server response');
  } else if (firstByte > 300) {
    score -= 15;
    issues.push('Server response could be faster');
  }
  
  // Total time scoring
  if (totalTime > 3000) {
    score -= 30;
    issues.push('Page loads too slowly');
  } else if (totalTime > 1500) {
    score -= 15;
    issues.push('Page load time could be improved');
  }
  
  // Size scoring
  const sizeKB = size / 1024;
  if (sizeKB > 500) {
    score -= 20;
    issues.push('Page size is too large');
  } else if (sizeKB > 250) {
    score -= 10;
    issues.push('Page size could be reduced');
  }
  
  return {
    score,
    rating: score >= 80 ? 'good' : score >= 60 ? 'moderate' : 'poor',
    issues,
  };
}

function generateRecommendations(results) {
  const recommendations = [];
  const successfulResults = results.filter(r => !r.error);
  
  successfulResults.forEach(result => {
    if (result.performance.issues.length > 0) {
      result.performance.issues.forEach(issue => {
        let recommendation = `${result.route}: ${issue}`;
        
        // Add specific recommendations
        if (issue.includes('server response')) {
          recommendation += ' - Consider implementing server-side caching';
        } else if (issue.includes('load time')) {
          recommendation += ' - Implement code splitting and lazy loading';
        } else if (issue.includes('size')) {
          recommendation += ` (${result.metrics.sizeKB}KB) - Optimize images and remove unused code`;
        }
        
        recommendations.push(recommendation);
      });
    }
  });
  
  return recommendations;
}

// Check if server is running
async function checkServer() {
  return new Promise((resolve) => {
    http.get(BASE_URL, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error(`❌ Server is not running at ${BASE_URL}`);
    console.log('💡 Please start the development server with: npm run dev');
    process.exit(1);
  }
  
  try {
    await runPerformanceCheck();
  } catch (error) {
    console.error('❌ Performance check failed:', error);
    process.exit(1);
  }
})();