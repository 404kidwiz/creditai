#!/usr/bin/env node

/**
 * Script to replace console.log statements with structured logging
 * Replaces 521 console.log statements across 65 files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = path.resolve(__dirname, '..');
const excludeDirs = ['node_modules', '.next', 'out', 'dist', '.git'];
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// Logging patterns to replace
const patterns = [
  {
    // Simple console.log
    regex: /console\.log\((.*?)\)/g,
    replacement: (match, args) => `logger.info(${args})`
  },
  {
    // console.log with template literals
    regex: /console\.log\(`(.*?)`(.*?)\)/g,
    replacement: (match, message, args) => `logger.info(\`${message}\`${args})`
  },
  {
    // console.warn
    regex: /console\.warn\((.*?)\)/g,
    replacement: (match, args) => `logger.warn(${args})`
  },
  {
    // console.error
    regex: /console\.error\((.*?)\)/g,
    replacement: (match, args) => `logger.error(${args})`
  },
  {
    // console.info
    regex: /console\.info\((.*?)\)/g,
    replacement: (match, args) => `logger.info(${args})`
  },
  {
    // console.debug
    regex: /console\.debug\((.*?)\)/g,
    replacement: (match, args) => `logger.debug(${args})`
  }
];

// Import statement to add
const importStatement = "import { createLogger } from '@/lib/logging';\n";
const loggerDeclaration = "const logger = createLogger('COMPONENT_NAME');\n";

// Stats
let totalFilesProcessed = 0;
let totalReplacements = 0;
let filesModified = 0;

// Find all files with console.log statements
console.log('Searching for files with console.log statements...');
const findCommand = `find ${rootDir} -type f ${fileExtensions.map(ext => `-name "*${ext}"`).join(' -o ')} | xargs grep -l "console\\.\\(log\\|warn\\|error\\|info\\|debug\\)" 2>/dev/null`;

try {
  const filesWithLogs = execSync(findCommand, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter(file => !excludeDirs.some(dir => file.includes(`/${dir}/`)));

  console.log(`Found ${filesWithLogs.length} files with console statements`);

  // Process each file
  filesWithLogs.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let replacementsInFile = 0;

    // Extract component name for logger
    const fileName = path.basename(filePath, path.extname(filePath));
    const dirName = path.basename(path.dirname(filePath));
    const componentName = dirName === 'src' || dirName === 'app' || dirName === 'lib' 
      ? fileName 
      : `${dirName}:${fileName}`;
    
    // Replace console statements
    patterns.forEach(({ regex, replacement }) => {
      content = content.replace(regex, (match, ...args) => {
        replacementsInFile++;
        return replacement(match, ...args);
      });
    });

    // Add import statement if replacements were made
    if (replacementsInFile > 0) {
      // Check if import already exists
      if (!content.includes("import { createLogger }")) {
        // Find the last import statement
        const importRegex = /^import .+?;$/gm;
        const imports = [...content.matchAll(importRegex)];
        
        if (imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          const insertPosition = lastImport.index + lastImport[0].length;
          content = content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
        } else {
          // No imports found, add at the beginning
          content = importStatement + content;
        }
      }

      // Add logger declaration if it doesn't exist
      if (!content.includes("const logger = createLogger")) {
        // Find position after imports
        const afterImports = content.search(/^(?!import).*$/m);
        if (afterImports !== -1) {
          const customLoggerDeclaration = loggerDeclaration.replace('COMPONENT_NAME', componentName);
          content = content.slice(0, afterImports) + '\n' + customLoggerDeclaration + content.slice(afterImports);
        }
      }

      // Write changes back to file
      fs.writeFileSync(filePath, content, 'utf8');
      
      totalReplacements += replacementsInFile;
      filesModified++;
      console.log(`✅ ${filePath}: ${replacementsInFile} replacements`);
    }

    totalFilesProcessed++;
  });

  console.log('\nReplacement Summary:');
  console.log(`Total files processed: ${totalFilesProcessed}`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total console statements replaced: ${totalReplacements}`);

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}