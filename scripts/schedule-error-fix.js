#!/usr/bin/env node

/**
 * This script sets up a file watcher to monitor the knowledgebase directory
 * and automatically run the fix-file-errors.js script when changes are detected.
 * 
 * Usage:
 * - Run directly: node scripts/schedule-error-fix.js
 * - Run in background: node scripts/schedule-error-fix.js &
 * - Stop the watcher: kill the process
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar'); // You may need to install this: npm install chokidar

// Paths
const KNOWLEDGEBASE_DIR = path.join(process.cwd(), 'knowledgebase');
const ERROR_FIX_SCRIPT = path.join(process.cwd(), 'scripts', 'fix-file-errors.js');

// Check if chokidar is installed
try {
  require.resolve('chokidar');
} catch (e) {
  console.error('Error: chokidar package is not installed.');
  console.error('Please install it using: npm install chokidar');
  process.exit(1);
}

// Check if the error fix script exists
if (!fs.existsSync(ERROR_FIX_SCRIPT)) {
  console.error(`Error: Script not found: ${ERROR_FIX_SCRIPT}`);
  process.exit(1);
}

// Ensure the script is executable
try {
  fs.chmodSync(ERROR_FIX_SCRIPT, '755');
} catch (error) {
  console.warn(`Warning: Could not make script executable: ${error.message}`);
}

// Debounce function to prevent multiple runs in quick succession
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Function to run the error fix script
function runErrorFixScript() {
  console.log(`[${new Date().toISOString()}] Running file error fix script...`);
  
  const child = spawn('node', [ERROR_FIX_SCRIPT], {
    stdio: 'inherit'
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`[${new Date().toISOString()}] Error fix script exited with code ${code}`);
    } else {
      console.log(`[${new Date().toISOString()}] Error fix script completed successfully`);
    }
  });
}

// Debounced version of the run function (wait 30 seconds after changes before running)
const debouncedRun = debounce(runErrorFixScript, 30000);

// Set up the file watcher
console.log(`[${new Date().toISOString()}] Starting file watcher for ${KNOWLEDGEBASE_DIR}`);

const watcher = chokidar.watch(KNOWLEDGEBASE_DIR, {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
});

// Add event listeners
watcher
  .on('add', path => {
    console.log(`[${new Date().toISOString()}] File added: ${path}`);
    debouncedRun();
  })
  .on('change', path => {
    console.log(`[${new Date().toISOString()}] File changed: ${path}`);
    debouncedRun();
  })
  .on('unlink', path => {
    console.log(`[${new Date().toISOString()}] File removed: ${path}`);
    debouncedRun();
  })
  .on('error', error => console.error(`[${new Date().toISOString()}] Watcher error: ${error}`));

console.log(`[${new Date().toISOString()}] File watcher started. Monitoring for changes...`);
console.log('Press Ctrl+C to stop the watcher');

// Run once at startup to fix any existing errors
setTimeout(runErrorFixScript, 5000); 