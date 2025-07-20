// Simple test to verify API endpoint structure
const fs = require('fs');
const path = require('path');

const apiEndpoints = [
  'src/app/api/disputes/eoscar/generate/route.ts',
  'src/app/api/disputes/eoscar/validate/route.ts', 
  'src/app/api/disputes/eoscar/batch/route.ts',
  'src/app/api/bureaus/coordinate/route.ts'
];

console.log('Checking API endpoints...');

apiEndpoints.forEach(endpoint => {
  const fullPath = path.join(__dirname, endpoint);
  
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check for basic structure
    const hasPost = content.includes('export async function POST');
    const hasGet = content.includes('export async function GET');
    const hasImports = content.includes('import');
    const hasNextResponse = content.includes('NextResponse');
    
    console.log(`\n${endpoint}:`);
    console.log(`  - POST handler: ${hasPost ? '✓' : '✗'}`);
    console.log(`  - GET handler: ${hasGet ? '✓' : '✗'}`);
    console.log(`  - Imports: ${hasImports ? '✓' : '✗'}`);
    console.log(`  - NextResponse: ${hasNextResponse ? '✓' : '✗'}`);
    
    // Check for syntax issues (basic)
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    console.log(`  - Brace balance: ${openBraces === closeBraces ? '✓' : '✗'} (${openBraces}/${closeBraces})`);
    
  } else {
    console.log(`\n${endpoint}: ✗ File not found`);
  }
});

console.log('\nAPI endpoint check complete.');