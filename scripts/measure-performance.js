#!/usr/bin/env node

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
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

// Performance thresholds
const THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.9,
  'best-practices': 0.9,
  seo: 0.9,
  pwa: 0.8,
};

async function runLighthouse(url, options = {}) {
  const chrome = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  options.port = (new URL(chrome.wsEndpoint())).port;
  
  const runnerResult = await lighthouse(url, {
    ...options,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
  });
  
  await chrome.close();
  
  return runnerResult;
}

async function measurePerformance() {
  console.log('🚀 Starting performance measurements...\n');
  
  const results = [];
  const timestamp = new Date().toISOString();
  
  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    console.log(`📊 Testing ${route.name} (${url})...`);
    
    try {
      const result = await runLighthouse(url);
      const { lhr } = result;
      
      const scores = {
        route: route.name,
        path: route.path,
        scores: {
          performance: lhr.categories.performance.score,
          accessibility: lhr.categories.accessibility.score,
          'best-practices': lhr.categories['best-practices'].score,
          seo: lhr.categories.seo.score,
          pwa: lhr.categories.pwa.score,
        },
        metrics: {
          firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
          speedIndex: lhr.audits['speed-index'].numericValue,
          largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
          timeToInteractive: lhr.audits['interactive'].numericValue,
          totalBlockingTime: lhr.audits['total-blocking-time'].numericValue,
          cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
        },
      };
      
      results.push(scores);
      
      // Print summary
      console.log(`✅ ${route.name} completed:`);
      Object.entries(scores.scores).forEach(([category, score]) => {
        const emoji = score >= THRESHOLDS[category] ? '✅' : '⚠️';
        console.log(`   ${emoji} ${category}: ${(score * 100).toFixed(0)}`);
      });
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
  
  // Generate report
  const report = {
    timestamp,
    baseUrl: BASE_URL,
    results,
    summary: generateSummary(results),
  };
  
  // Save report
  const reportPath = path.join(__dirname, '../performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📋 Performance Report Summary:');
  console.log('================================\n');
  
  // Print summary
  const avgScores = calculateAverageScores(results);
  Object.entries(avgScores).forEach(([category, score]) => {
    const emoji = score >= THRESHOLDS[category] ? '✅' : '⚠️';
    console.log(`${emoji} Average ${category}: ${(score * 100).toFixed(0)}`);
  });
  
  // Print recommendations
  const recommendations = generateRecommendations(results);
  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach(rec => console.log(`   - ${rec}`));
  }
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

function generateSummary(results) {
  const successfulResults = results.filter(r => !r.error);
  
  return {
    totalRoutes: results.length,
    successfulTests: successfulResults.length,
    averageScores: calculateAverageScores(successfulResults),
    performanceMetrics: calculateAverageMetrics(successfulResults),
  };
}

function calculateAverageScores(results) {
  const successfulResults = results.filter(r => !r.error);
  if (successfulResults.length === 0) return {};
  
  const categories = Object.keys(successfulResults[0].scores);
  const avgScores = {};
  
  categories.forEach(category => {
    const scores = successfulResults.map(r => r.scores[category]);
    avgScores[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });
  
  return avgScores;
}

function calculateAverageMetrics(results) {
  const successfulResults = results.filter(r => !r.error);
  if (successfulResults.length === 0) return {};
  
  const metrics = Object.keys(successfulResults[0].metrics);
  const avgMetrics = {};
  
  metrics.forEach(metric => {
    const values = successfulResults.map(r => r.metrics[metric]);
    avgMetrics[metric] = values.reduce((sum, value) => sum + value, 0) / values.length;
  });
  
  return avgMetrics;
}

function generateRecommendations(results) {
  const recommendations = [];
  const successfulResults = results.filter(r => !r.error);
  
  successfulResults.forEach(result => {
    // Performance recommendations
    if (result.scores.performance < 0.9) {
      if (result.metrics.largestContentfulPaint > 2500) {
        recommendations.push(`${result.route}: Optimize LCP (currently ${Math.round(result.metrics.largestContentfulPaint)}ms)`);
      }
      if (result.metrics.totalBlockingTime > 300) {
        recommendations.push(`${result.route}: Reduce TBT (currently ${Math.round(result.metrics.totalBlockingTime)}ms)`);
      }
    }
    
    // Accessibility recommendations
    if (result.scores.accessibility < 0.9) {
      recommendations.push(`${result.route}: Improve accessibility score`);
    }
    
    // SEO recommendations
    if (result.scores.seo < 0.9) {
      recommendations.push(`${result.route}: Optimize for SEO`);
    }
  });
  
  return [...new Set(recommendations)]; // Remove duplicates
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch (error) {
    return false;
  }
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
    await measurePerformance();
  } catch (error) {
    console.error('❌ Performance measurement failed:', error);
    process.exit(1);
  }
})();