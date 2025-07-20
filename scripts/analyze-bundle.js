#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Starting bundle analysis...\n');

// Set environment variable for bundle analysis
process.env.ANALYZE = 'true';

// Run the build with bundle analysis
const buildProcess = exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Build failed:', error);
    return;
  }

  console.log('✅ Build completed successfully!\n');
  console.log('📊 Bundle analysis reports generated:');
  console.log('   - Client bundle: .next/analyze/client.html');
  console.log('   - Server bundle: .next/analyze/server.html\n');

  // Check bundle sizes
  checkBundleSizes();
});

// Stream output
buildProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

buildProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

function checkBundleSizes() {
  const buildManifest = path.join(__dirname, '../.next/build-manifest.json');
  
  if (!fs.existsSync(buildManifest)) {
    console.warn('⚠️  Build manifest not found. Cannot analyze bundle sizes.');
    return;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
    const pages = Object.keys(manifest.pages || {});
    
    console.log('📦 Page bundle sizes:\n');
    
    pages.forEach(page => {
      const files = manifest.pages[page] || [];
      let totalSize = 0;
      
      files.forEach(file => {
        const filePath = path.join(__dirname, '../.next', file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      });
      
      const sizeInKB = (totalSize / 1024).toFixed(2);
      const emoji = sizeInKB > 200 ? '⚠️ ' : '✅';
      console.log(`${emoji} ${page}: ${sizeInKB} KB`);
    });
    
    // Check static chunks
    const staticDir = path.join(__dirname, '../.next/static/chunks');
    if (fs.existsSync(staticDir)) {
      console.log('\n📊 Static chunk sizes:\n');
      
      const chunks = fs.readdirSync(staticDir)
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const stats = fs.statSync(path.join(staticDir, file));
          return {
            name: file,
            size: stats.size
          };
        })
        .sort((a, b) => b.size - a.size)
        .slice(0, 10); // Top 10 largest chunks
      
      chunks.forEach(chunk => {
        const sizeInKB = (chunk.size / 1024).toFixed(2);
        const emoji = sizeInKB > 100 ? '⚠️ ' : '✅';
        console.log(`${emoji} ${chunk.name}: ${sizeInKB} KB`);
      });
    }
    
    // Performance recommendations
    console.log('\n💡 Performance Recommendations:\n');
    
    const recommendations = [];
    
    // Check for large pages
    pages.forEach(page => {
      const files = manifest.pages[page] || [];
      let totalSize = 0;
      
      files.forEach(file => {
        const filePath = path.join(__dirname, '../.next', file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      });
      
      const sizeInKB = totalSize / 1024;
      if (sizeInKB > 200) {
        recommendations.push(`- Consider code splitting for ${page} (${sizeInKB.toFixed(2)} KB)`);
      }
    });
    
    if (recommendations.length > 0) {
      recommendations.forEach(rec => console.log(rec));
    } else {
      console.log('✅ All page bundles are within recommended size limits!');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing bundle sizes:', error);
  }
}

// Generate performance report
function generatePerformanceReport() {
  const report = {
    timestamp: new Date().toISOString(),
    bundles: {},
    recommendations: [],
    score: 0
  };
  
  // Write report
  const reportPath = path.join(__dirname, '../bundle-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Performance report saved to: ${reportPath}`);
}