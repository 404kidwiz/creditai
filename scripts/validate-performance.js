#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Performance Improvements...\n');

// Check if lazy loading is implemented
function checkLazyLoading() {
  console.log('📦 Checking Lazy Loading Implementation:');
  
  const filesToCheck = [
    { path: 'src/app/dashboard/page.tsx', feature: 'Dashboard lazy loading' },
    { path: 'src/app/(main)/upload/page.tsx', feature: 'Upload page lazy loading' },
    { path: 'src/app/analysis-results/page.tsx', feature: 'Analysis page lazy loading' },
    { path: 'src/components/lazy/index.ts', feature: 'Lazy component system' },
    { path: 'src/lib/performance/lazyLoader.ts', feature: 'LazyLoader implementation' },
  ];
  
  let passedChecks = 0;
  
  filesToCheck.forEach(({ path: filePath, feature }) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const hasLazyLoading = content.includes('dynamic') || 
                            content.includes('lazy') || 
                            content.includes('Suspense');
      
      if (hasLazyLoading) {
        console.log(`  ✅ ${feature}`);
        passedChecks++;
      } else {
        console.log(`  ⚠️  ${feature} - No lazy loading detected`);
      }
    } else {
      console.log(`  ❌ ${feature} - File not found`);
    }
  });
  
  console.log(`\n  Summary: ${passedChecks}/${filesToCheck.length} checks passed\n`);
  return passedChecks === filesToCheck.length;
}

// Check bundle optimization
function checkBundleOptimization() {
  console.log('⚡ Checking Bundle Optimization:');
  
  const nextConfig = path.join(__dirname, '../next.config.js');
  if (fs.existsSync(nextConfig)) {
    const content = fs.readFileSync(nextConfig, 'utf8');
    
    const checks = [
      { feature: 'Webpack optimization', pattern: /optimization\.splitChunks/ },
      { feature: 'Bundle analyzer', pattern: /bundle-analyzer/ },
      { feature: 'Image optimization', pattern: /images:.*{/ },
      { feature: 'Compiler optimizations', pattern: /compiler:.*{/ },
    ];
    
    let passedChecks = 0;
    
    checks.forEach(({ feature, pattern }) => {
      if (pattern.test(content)) {
        console.log(`  ✅ ${feature}`);
        passedChecks++;
      } else {
        console.log(`  ⚠️  ${feature} - Not configured`);
      }
    });
    
    console.log(`\n  Summary: ${passedChecks}/${checks.length} optimizations found\n`);
    return passedChecks >= 3;
  }
  
  console.log('  ❌ next.config.js not found\n');
  return false;
}

// Check performance monitoring
function checkPerformanceMonitoring() {
  console.log('📊 Checking Performance Monitoring:');
  
  const filesToCheck = [
    { path: 'src/lib/performance/config.ts', feature: 'Performance configuration' },
    { path: 'src/lib/performance/init.ts', feature: 'Performance initialization' },
    { path: 'src/styles/critical.css', feature: 'Critical CSS' },
    { path: 'scripts/check-performance.js', feature: 'Performance check script' },
    { path: 'scripts/analyze-bundle.js', feature: 'Bundle analysis script' },
  ];
  
  let passedChecks = 0;
  
  filesToCheck.forEach(({ path: filePath, feature }) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${feature}`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${feature} - Not found`);
    }
  });
  
  console.log(`\n  Summary: ${passedChecks}/${filesToCheck.length} monitoring tools available\n`);
  return passedChecks >= 4;
}

// Check loading states
function checkLoadingStates() {
  console.log('⏳ Checking Loading States:');
  
  const loadingFiles = [
    'src/app/dashboard/loading.tsx',
    'src/app/(main)/upload/loading.tsx',
    'src/app/analysis-results/loading.tsx',
  ];
  
  let foundCount = 0;
  
  loadingFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      foundCount++;
    }
  });
  
  console.log(`  ✅ Found ${foundCount}/${loadingFiles.length} loading components\n`);
  return foundCount >= 2;
}

// Main validation
function validatePerformance() {
  console.log('Performance Improvement Validation Report');
  console.log('========================================\n');
  
  const results = {
    lazyLoading: checkLazyLoading(),
    bundleOptimization: checkBundleOptimization(),
    performanceMonitoring: checkPerformanceMonitoring(),
    loadingStates: checkLoadingStates(),
  };
  
  console.log('📋 Final Summary:');
  console.log('================\n');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  
  Object.entries(results).forEach(([check, passed]) => {
    const emoji = passed ? '✅' : '❌';
    const status = passed ? 'PASSED' : 'FAILED';
    console.log(`${emoji} ${check}: ${status}`);
  });
  
  console.log(`\nOverall: ${passedChecks}/${totalChecks} categories passed`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 All performance improvements successfully implemented!');
    
    console.log('\n💡 Next Steps:');
    console.log('1. Run `npm run build` to create production build');
    console.log('2. Run `npm run analyze` to check bundle sizes');
    console.log('3. Run `npm run perf:check` to measure performance');
    console.log('4. Deploy and monitor Web Vitals in production');
  } else {
    console.log('\n⚠️  Some performance improvements are missing or incomplete.');
    console.log('Please review the failed checks above.');
  }
}

// Run validation
validatePerformance();