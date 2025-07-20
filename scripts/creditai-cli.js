#!/usr/bin/env node

/**
 * CreditAI CLI - Unified Command Line Interface
 * 
 * This script provides a unified interface for all CreditAI infrastructure
 * management operations including setup, validation, diagnostics, and maintenance.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import infrastructure modules
const MasterInfrastructureDeployment = require('./master-infrastructure-deploy');
const ComprehensiveValidationSuite = require('./comprehensive-validation-suite');
const InfrastructureDiagnostics = require('./infrastructure-diagnostics');

class CreditAICLI {
  constructor() {
    this.version = '1.0.0';
    this.scriptsDir = __dirname;
    
    this.commands = {
      // Setup commands
      'setup': {
        description: 'Complete infrastructure setup',
        handler: this.setup.bind(this),
        aliases: ['install', 'init']
      },
      'setup-quick': {
        description: 'Quick setup with defaults',
        handler: this.setupQuick.bind(this),
        aliases: ['quick', 'fast-setup']
      },
      
      // Validation commands
      'validate': {
        description: 'Validate infrastructure configuration',
        handler: this.validate.bind(this),
        aliases: ['check', 'verify']
      },
      'validate-quick': {
        description: 'Quick validation check',
        handler: this.validateQuick.bind(this),
        aliases: ['health', 'status']
      },
      
      // Diagnostic commands
      'diagnose': {
        description: 'Run comprehensive diagnostics',
        handler: this.diagnose.bind(this),
        aliases: ['debug', 'troubleshoot']
      },
      'diagnose-google-cloud': {
        description: 'Diagnose Google Cloud configuration',
        handler: this.diagnoseGoogleCloud.bind(this),
        aliases: ['gc-diagnose']
      },
      'diagnose-supabase': {
        description: 'Diagnose Supabase configuration',
        handler: this.diagnoseSupabase.bind(this),
        aliases: ['sb-diagnose']
      },
      
      // Testing commands
      'test': {
        description: 'Run infrastructure tests',
        handler: this.test.bind(this),
        aliases: ['test-all']
      },
      'test-pdf': {
        description: 'Test PDF processing pipeline',
        handler: this.testPDF.bind(this),
        aliases: ['test-processing']
      },
      'test-upload': {
        description: 'Test file upload functionality',
        handler: this.testUpload.bind(this),
        aliases: ['upload-test']
      },
      
      // Maintenance commands
      'update': {
        description: 'Update dependencies and configuration',
        handler: this.update.bind(this),
        aliases: ['upgrade']
      },
      'backup': {
        description: 'Backup configuration and data',
        handler: this.backup.bind(this),
        aliases: ['backup-config']
      },
      'restore': {
        description: 'Restore from backup',
        handler: this.restore.bind(this),
        aliases: ['restore-config']
      },
      
      // Environment commands
      'env': {
        description: 'Environment management',
        handler: this.env.bind(this),
        aliases: ['environment']
      },
      'env-check': {
        description: 'Check environment variables',
        handler: this.envCheck.bind(this),
        aliases: ['check-env']
      },
      'env-generate': {
        description: 'Generate environment template',
        handler: this.envGenerate.bind(this),
        aliases: ['gen-env']
      },
      
      // Service management
      'start': {
        description: 'Start local services',
        handler: this.start.bind(this),
        aliases: ['run', 'serve']
      },
      'stop': {
        description: 'Stop local services',
        handler: this.stop.bind(this),
        aliases: ['kill']
      },
      'restart': {
        description: 'Restart local services',
        handler: this.restart.bind(this),
        aliases: ['reload']
      },
      
      // Information commands
      'info': {
        description: 'Show system information',
        handler: this.info.bind(this),
        aliases: ['version', 'about']
      },
      'help': {
        description: 'Show help information',
        handler: this.help.bind(this),
        aliases: ['h', '?']
      }
    };
  }

  /**
   * Main CLI entry point
   */
  async run(args = process.argv.slice(2)) {
    try {
      if (args.length === 0) {
        await this.showInteractiveMenu();
        return;
      }

      const [command, ...commandArgs] = args;
      const normalizedCommand = this.normalizeCommand(command);

      if (!normalizedCommand) {
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run: creditai help');
        process.exit(1);
      }

      await this.commands[normalizedCommand].handler(commandArgs);

    } catch (error) {
      console.error(`❌ CLI Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Normalize command by checking aliases
   */
  normalizeCommand(command) {
    // Direct match
    if (this.commands[command]) {
      return command;
    }

    // Check aliases
    for (const [cmd, config] of Object.entries(this.commands)) {
      if (config.aliases && config.aliases.includes(command)) {
        return cmd;
      }
    }

    return null;
  }

  /**
   * Show interactive menu for command selection
   */
  async showInteractiveMenu() {
    console.log(`🚀 CreditAI CLI v${this.version}`);
    console.log('═'.repeat(40));
    console.log('Choose an operation:');
    console.log('');

    const categories = {
      'Setup & Installation': ['setup', 'setup-quick'],
      'Validation & Testing': ['validate', 'test', 'test-pdf'],
      'Diagnostics & Troubleshooting': ['diagnose', 'diagnose-google-cloud', 'diagnose-supabase'],
      'Environment Management': ['env-check', 'env-generate', 'start', 'stop'],
      'Maintenance': ['update', 'backup', 'restore'],
      'Information': ['info', 'help']
    };

    let index = 1;
    const menuOptions = [];

    Object.entries(categories).forEach(([category, commands]) => {
      console.log(`\n📋 ${category}:`);
      commands.forEach(cmd => {
        console.log(`  ${index}. ${cmd} - ${this.commands[cmd].description}`);
        menuOptions.push(cmd);
        index++;
      });
    });

    console.log(`\n  ${index}. quit - Exit CLI`);
    menuOptions.push('quit');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('\nSelect option (number or command name): ', resolve);
    });

    rl.close();

    const selection = parseInt(answer);
    if (!isNaN(selection) && selection >= 1 && selection <= menuOptions.length) {
      const selectedCommand = menuOptions[selection - 1];
      if (selectedCommand === 'quit') {
        console.log('👋 Goodbye!');
        return;
      }
      await this.commands[selectedCommand].handler([]);
    } else if (menuOptions.includes(answer)) {
      if (answer === 'quit') {
        console.log('👋 Goodbye!');
        return;
      }
      await this.commands[answer].handler([]);
    } else {
      console.log('❌ Invalid selection');
    }
  }

  /**
   * Setup command - complete infrastructure setup
   */
  async setup(args) {
    console.log('🚀 Starting CreditAI Infrastructure Setup');
    
    const options = this.parseSetupOptions(args);
    const deployment = new MasterInfrastructureDeployment(options);
    
    const success = await deployment.deploy();
    
    if (success) {
      console.log('\n🎉 Setup completed successfully!');
      console.log('Next steps:');
      console.log('1. Run: creditai validate');
      console.log('2. Start development: npm run dev');
    } else {
      console.log('\n❌ Setup failed. Run diagnostics: creditai diagnose');
      process.exit(1);
    }
  }

  /**
   * Quick setup command
   */
  async setupQuick(args) {
    console.log('⚡ Starting Quick Setup');
    
    const options = {
      skipConfirmation: true,
      deploymentMode: 'development',
      validateAll: false,
      ...this.parseSetupOptions(args)
    };
    
    const deployment = new MasterInfrastructureDeployment(options);
    await deployment.deploy();
  }

  /**
   * Validate command
   */
  async validate(args) {
    console.log('🔍 Running Infrastructure Validation');
    
    const options = this.parseValidationOptions(args);
    const validator = new ComprehensiveValidationSuite(options);
    
    const success = await validator.validate();
    
    if (!success) {
      console.log('\n💡 Run diagnostics for detailed troubleshooting: creditai diagnose');
      process.exit(1);
    }
  }

  /**
   * Quick validation command
   */
  async validateQuick(args) {
    console.log('⚡ Running Quick Health Check');
    
    await this.runScript('./check-setup.js');
  }

  /**
   * Diagnose command
   */
  async diagnose(args) {
    console.log('🔬 Running Infrastructure Diagnostics');
    
    const options = this.parseDiagnosticOptions(args);
    const diagnostics = new InfrastructureDiagnostics(options);
    
    await diagnostics.diagnose();
  }

  /**
   * Google Cloud specific diagnostics
   */
  async diagnoseGoogleCloud(args) {
    console.log('☁️ Diagnosing Google Cloud Configuration');
    
    await this.runScript('./diagnose-google-cloud-setup.js');
  }

  /**
   * Supabase specific diagnostics
   */
  async diagnoseSupabase(args) {
    console.log('🗃️ Diagnosing Supabase Configuration');
    
    // Check Supabase connection and configuration
    try {
      require('dotenv').config({ path: '.env.local' });
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.log('❌ NEXT_PUBLIC_SUPABASE_URL not configured');
        return;
      }
      
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('❌ SUPABASE_SERVICE_ROLE_KEY not configured');
        return;
      }
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Test connection
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      if (error) {
        console.log(`❌ Supabase connection failed: ${error.message}`);
      } else {
        console.log('✅ Supabase connection successful');
      }
      
    } catch (error) {
      console.log(`❌ Supabase diagnostic failed: ${error.message}`);
    }
  }

  /**
   * Test command
   */
  async test(args) {
    console.log('🧪 Running Infrastructure Tests');
    
    await this.runScript('./run-comprehensive-tests.js');
  }

  /**
   * Test PDF processing
   */
  async testPDF(args) {
    console.log('📄 Testing PDF Processing Pipeline');
    
    await this.runScript('./test-pdf-processing.js');
  }

  /**
   * Test upload functionality
   */
  async testUpload(args) {
    console.log('📤 Testing Upload Functionality');
    
    await this.runScript('./test-upload-functionality.js');
  }

  /**
   * Update command
   */
  async update(args) {
    console.log('🔄 Updating Dependencies and Configuration');
    
    // Update npm dependencies
    console.log('📦 Updating npm dependencies...');
    execSync('npm update', { stdio: 'inherit' });
    
    // Update Google Cloud SDK
    try {
      console.log('☁️ Updating Google Cloud SDK...');
      execSync('gcloud components update --quiet', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️ Could not update Google Cloud SDK automatically');
    }
    
    // Update Supabase CLI
    try {
      console.log('🗃️ Updating Supabase CLI...');
      execSync('npm install -g supabase@latest', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️ Could not update Supabase CLI automatically');
    }
    
    console.log('✅ Update completed');
  }

  /**
   * Backup command
   */
  async backup(args) {
    console.log('💾 Creating Configuration Backup');
    
    const backupDir = path.join(process.cwd(), 'backups', `backup-${Date.now()}`);
    
    if (!fs.existsSync(path.dirname(backupDir))) {
      fs.mkdirSync(path.dirname(backupDir), { recursive: true });
    }
    fs.mkdirSync(backupDir);
    
    // Backup configuration files
    const filesToBackup = [
      '.env.local',
      'package.json',
      'package-lock.json',
      'google-cloud-key.json'
    ];
    
    filesToBackup.forEach(file => {
      const sourcePath = path.join(process.cwd(), file);
      const destPath = path.join(backupDir, file);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Backed up: ${file}`);
      }
    });
    
    console.log(`📁 Backup created at: ${backupDir}`);
  }

  /**
   * Restore command
   */
  async restore(args) {
    console.log('🔄 Restoring from Backup');
    
    const backupDir = args[0];
    if (!backupDir) {
      console.log('❌ Please specify backup directory');
      console.log('Usage: creditai restore <backup-directory>');
      return;
    }
    
    if (!fs.existsSync(backupDir)) {
      console.log(`❌ Backup directory not found: ${backupDir}`);
      return;
    }
    
    // List files to restore
    const files = fs.readdirSync(backupDir);
    console.log(`Found ${files.length} files to restore`);
    
    // Confirm restore
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirm = await new Promise(resolve => {
      rl.question('❓ This will overwrite existing files. Continue? (y/N): ', resolve);
    });
    
    rl.close();
    
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Restore cancelled');
      return;
    }
    
    // Restore files
    files.forEach(file => {
      const sourcePath = path.join(backupDir, file);
      const destPath = path.join(process.cwd(), file);
      
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Restored: ${file}`);
    });
    
    console.log('🎉 Restore completed');
  }

  /**
   * Environment management
   */
  async env(args) {
    const subcommand = args[0];
    
    switch (subcommand) {
      case 'check':
        await this.envCheck(args.slice(1));
        break;
      case 'generate':
        await this.envGenerate(args.slice(1));
        break;
      default:
        console.log('Environment management commands:');
        console.log('  creditai env check     - Check environment variables');
        console.log('  creditai env generate  - Generate environment template');
    }
  }

  /**
   * Check environment variables
   */
  async envCheck(args) {
    console.log('🔍 Checking Environment Variables');
    
    require('dotenv').config({ path: '.env.local' });
    
    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_AI_API_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    console.log('\nRequired Variables:');
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
      } else {
        console.log(`❌ ${varName}: Not set`);
      }
    });
  }

  /**
   * Generate environment template
   */
  async envGenerate(args) {
    console.log('📝 Generating Environment Template');
    
    const template = `# CreditAI Environment Configuration
# Generated by CreditAI CLI on ${new Date().toISOString()}

# Application Configuration
NODE_ENV=development

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us
GOOGLE_AI_API_KEY=your-google-ai-api-key
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json

# Document AI Configuration
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_CLOUD_DOCUMENT_AI_ENABLED=true
GOOGLE_CLOUD_VISION_API_ENABLED=true

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Security Configuration
PII_MASKING_ENABLED=true
PII_ENCRYPTION_ENABLED=true
TEMP_FILE_CLEANUP_ENABLED=true
SECURITY_AUDIT_LOGGING_ENABLED=true

# PDF Processing Configuration
PDF_PROCESSING_TIMEOUT=300000
PDF_MAX_SIZE=20971520
PDF_PROCESSING_FALLBACK_ENABLED=true
PDF_PROCESSING_CONFIDENCE_THRESHOLD=70

# Monitoring Configuration
PDF_PROCESSING_MONITORING_ENABLED=true
PDF_PROCESSING_SUCCESS_RATE_THRESHOLD=85

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
`;
    
    const outputPath = '.env.local.template';
    fs.writeFileSync(outputPath, template);
    
    console.log(`✅ Environment template generated: ${outputPath}`);
    console.log('💡 Copy to .env.local and fill in your values');
  }

  /**
   * Start local services
   */
  async start(args) {
    console.log('🚀 Starting Local Services');
    
    // Start Supabase if available
    try {
      console.log('🗃️ Starting Supabase...');
      execSync('supabase start', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️ Could not start Supabase (may not be installed)');
    }
    
    // Start Next.js development server
    console.log('⚡ Starting Next.js development server...');
    spawn('npm', ['run', 'dev'], { stdio: 'inherit' });
  }

  /**
   * Stop local services
   */
  async stop(args) {
    console.log('🛑 Stopping Local Services');
    
    // Stop Supabase
    try {
      console.log('🗃️ Stopping Supabase...');
      execSync('supabase stop', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️ Could not stop Supabase');
    }
    
    // Kill any running processes on common ports
    const ports = [3000, 3001, 54323];
    ports.forEach(port => {
      try {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'pipe' });
        console.log(`✅ Stopped service on port ${port}`);
      } catch (error) {
        // Port not in use or could not kill
      }
    });
  }

  /**
   * Restart local services
   */
  async restart(args) {
    console.log('🔄 Restarting Local Services');
    
    await this.stop(args);
    setTimeout(() => this.start(args), 2000);
  }

  /**
   * Show system information
   */
  async info(args) {
    const os = require('os');
    
    console.log(`🚀 CreditAI CLI v${this.version}`);
    console.log('═'.repeat(40));
    console.log(`Platform: ${os.platform()} ${os.arch()}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Working Directory: ${process.cwd()}`);
    
    // Check tool versions
    const tools = [
      { name: 'npm', command: 'npm --version' },
      { name: 'Google Cloud CLI', command: 'gcloud --version' },
      { name: 'Docker', command: 'docker --version' },
      { name: 'Supabase CLI', command: 'supabase --version' }
    ];
    
    console.log('\n🔧 Tool Versions:');
    tools.forEach(tool => {
      try {
        const version = execSync(tool.command, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ ${tool.name}: ${version.split('\n')[0]}`);
      } catch (error) {
        console.log(`❌ ${tool.name}: Not installed`);
      }
    });
    
    // Show configuration status
    require('dotenv').config({ path: '.env.local' });
    console.log('\n⚙️ Configuration Status:');
    console.log(`Google Cloud Project: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'Not set'}`);
    console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Not set'}`);
  }

  /**
   * Show help information
   */
  async help(args) {
    const specificCommand = args[0];
    
    if (specificCommand && this.commands[specificCommand]) {
      console.log(`Help for: ${specificCommand}`);
      console.log(`Description: ${this.commands[specificCommand].description}`);
      if (this.commands[specificCommand].aliases) {
        console.log(`Aliases: ${this.commands[specificCommand].aliases.join(', ')}`);
      }
      return;
    }
    
    console.log(`🚀 CreditAI CLI v${this.version} - Infrastructure Management Tool`);
    console.log('═'.repeat(60));
    console.log('Usage: creditai <command> [options]');
    console.log('       creditai (interactive mode)');
    console.log('');
    
    const categories = {
      'Setup & Installation': [
        'setup                 Complete infrastructure setup',
        'setup-quick           Quick setup with defaults'
      ],
      'Validation & Testing': [
        'validate              Validate infrastructure configuration',
        'validate-quick        Quick health check',
        'test                  Run infrastructure tests',
        'test-pdf              Test PDF processing pipeline'
      ],
      'Diagnostics & Troubleshooting': [
        'diagnose              Run comprehensive diagnostics',
        'diagnose-google-cloud Diagnose Google Cloud configuration',
        'diagnose-supabase     Diagnose Supabase configuration'
      ],
      'Environment Management': [
        'env-check             Check environment variables',
        'env-generate          Generate environment template',
        'start                 Start local services',
        'stop                  Stop local services',
        'restart               Restart local services'
      ],
      'Maintenance': [
        'update                Update dependencies and configuration',
        'backup                Backup configuration and data',
        'restore <dir>         Restore from backup'
      ],
      'Information': [
        'info                  Show system information',
        'help [command]        Show help information'
      ]
    };
    
    Object.entries(categories).forEach(([category, commands]) => {
      console.log(`\n📋 ${category}:`);
      commands.forEach(cmd => {
        console.log(`  ${cmd}`);
      });
    });
    
    console.log('\nExamples:');
    console.log('  creditai setup                    # Complete setup');
    console.log('  creditai validate                 # Validate configuration');
    console.log('  creditai diagnose                 # Troubleshoot issues');
    console.log('  creditai start                    # Start development');
    console.log('');
    console.log('For more information: https://github.com/your-repo/creditai');
  }

  /**
   * Utility methods
   */

  parseSetupOptions(args) {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--skip-confirmation':
          options.skipConfirmation = true;
          break;
        case '--no-rollback':
          options.enableRollback = false;
          break;
        case '--mode':
          options.deploymentMode = args[++i];
          break;
        case '--no-validation':
          options.validateAll = false;
          break;
      }
    }
    
    return options;
  }

  parseValidationOptions(args) {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--verbose':
          options.verbose = true;
          break;
        case '--stop-on-failure':
          options.stopOnFailure = true;
          break;
        case '--no-report':
          options.generateReport = false;
          break;
      }
    }
    
    return options;
  }

  parseDiagnosticOptions(args) {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--verbose':
          options.verbose = true;
          break;
        case '--no-report':
          options.generateReport = false;
          break;
      }
    }
    
    return options;
  }

  async runScript(scriptPath) {
    return new Promise((resolve, reject) => {
      const fullPath = path.join(this.scriptsDir, scriptPath);
      
      if (!fs.existsSync(fullPath)) {
        reject(new Error(`Script not found: ${scriptPath}`));
        return;
      }
      
      const child = spawn('node', [fullPath], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Script ${scriptPath} exited with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// CLI entry point
if (require.main === module) {
  const cli = new CreditAICLI();
  cli.run().catch(error => {
    console.error('CLI Error:', error.message);
    process.exit(1);
  });
}

module.exports = CreditAICLI;