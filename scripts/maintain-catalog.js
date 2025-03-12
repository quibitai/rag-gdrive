#!/usr/bin/env node

/**
 * Maintain Catalog Script
 * 
 * This script performs comprehensive maintenance on the file catalog:
 * - Removes temporary files
 * - Cleans up missing files
 * - Fixes metadata size issues
 * - Resets processing status for files with errors
 * - Updates the knowledge base with selective processing
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

// Configuration
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'default-secret-key';
const API_HOST = 'localhost';
const API_PORT = 3000;
const API_PATH = '/api/scheduled-update';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  removeAll: args.includes('--remove-all'),
  cleanErrors: args.includes('--clean-errors'),
  force: args.includes('--force'),
  skipUpdate: args.includes('--skip-update'),
  verbose: args.includes('--verbose')
};

// Helper function to log verbose messages
function logVerbose(message) {
  if (options.verbose) {
    console.log(message);
  }
}

async function main() {
  console.log('Starting catalog maintenance...');
  
  try {
    // Load the file catalog
    const fileCatalogPath = path.join(process.cwd(), 'file-catalog.json');
    if (!fs.existsSync(fileCatalogPath)) {
      console.error('File catalog not found at:', fileCatalogPath);
      process.exit(1);
    }
    
    const catalogData = fs.readFileSync(fileCatalogPath, 'utf-8');
    const catalog = JSON.parse(catalogData);
    console.log(`Loaded file catalog with ${Object.keys(catalog.files).length} files`);
    
    // Track statistics
    const stats = {
      totalFiles: Object.keys(catalog.files).length,
      temporaryFilesRemoved: 0,
      missingFilesRemoved: 0,
      errorFilesReset: 0,
      metadataIssuesFixed: 0
    };
    
    // 1. Remove temporary files (files with names starting with ~$ or ._)
    const tempFileIds = Object.keys(catalog.files).filter(fileId => {
      const file = catalog.files[fileId];
      return file.name.startsWith('~$') || file.name.startsWith('._');
    });
    
    if (tempFileIds.length > 0) {
      console.log(`Found ${tempFileIds.length} temporary files to remove`);
      
      for (const fileId of tempFileIds) {
        const fileName = catalog.files[fileId].name;
        logVerbose(`Removing temporary file: ${fileName}`);
        delete catalog.files[fileId];
        stats.temporaryFilesRemoved++;
      }
      
      // Save the catalog after removing temporary files
      saveCatalog(catalog, fileCatalogPath);
    } else {
      console.log('No temporary files found');
    }
    
    // 2. Clean up missing files
    const knowledgebasePath = path.join(process.cwd(), 'knowledgebase');
    const missingFileIds = Object.keys(catalog.files).filter(fileId => {
      const file = catalog.files[fileId];
      const filePath = file.path ? `${file.path}/${file.name}` : file.name;
      const fullPath = path.join(knowledgebasePath, filePath);
      return !fs.existsSync(fullPath);
    });
    
    if (missingFileIds.length > 0) {
      console.log(`Found ${missingFileIds.length} missing files`);
      
      if (options.removeAll) {
        // Remove all missing files
        for (const fileId of missingFileIds) {
          const file = catalog.files[fileId];
          const filePath = file.path ? `${file.path}/${file.name}` : file.name;
          logVerbose(`Removing missing file: ${filePath}`);
          delete catalog.files[fileId];
          stats.missingFilesRemoved++;
        }
        
        // Save the catalog after removing missing files
        saveCatalog(catalog, fileCatalogPath);
      } else {
        // Only remove temporary missing files by default
        const tempMissingFileIds = missingFileIds.filter(fileId => {
          const file = catalog.files[fileId];
          return file.name.startsWith('~$') || file.name.startsWith('._');
        });
        
        if (tempMissingFileIds.length > 0) {
          for (const fileId of tempMissingFileIds) {
            const file = catalog.files[fileId];
            const filePath = file.path ? `${file.path}/${file.name}` : file.name;
            logVerbose(`Removing temporary missing file: ${filePath}`);
            delete catalog.files[fileId];
            stats.missingFilesRemoved++;
          }
          
          // Save the catalog after removing temporary missing files
          saveCatalog(catalog, fileCatalogPath);
        }
        
        if (tempMissingFileIds.length < missingFileIds.length) {
          console.log(`${missingFileIds.length - tempMissingFileIds.length} non-temporary missing files were not removed. Use --remove-all to remove all missing files.`);
        }
      }
    } else {
      console.log('No missing files found');
    }
    
    // 3. Reset processing status for files with errors
    const errorFileIds = Object.keys(catalog.files).filter(fileId => {
      return catalog.files[fileId].processingStatus === 'error';
    });
    
    if (errorFileIds.length > 0) {
      console.log(`Found ${errorFileIds.length} files with errors`);
      
      if (options.cleanErrors) {
        // Reset all error files
        for (const fileId of errorFileIds) {
          const file = catalog.files[fileId];
          const filePath = file.path ? `${file.path}/${file.name}` : file.name;
          logVerbose(`Resetting error status for file: ${filePath}`);
          file.processingStatus = 'pending';
          file.errorMessage = '';
          stats.errorFilesReset++;
        }
        
        // Save the catalog after resetting error files
        saveCatalog(catalog, fileCatalogPath);
      } else {
        console.log(`Error files were not reset. Use --clean-errors to reset all error files.`);
      }
    } else {
      console.log('No files with errors found');
    }
    
    // 4. Update the knowledge base with selective processing
    if (!options.skipUpdate) {
      console.log('\nUpdating knowledge base with selective processing...');
      
      // Check if the development server is running
      const isServerRunning = await checkServerRunning();
      
      if (!isServerRunning) {
        console.log('Development server is not running. Starting server...');
        startDevServer();
        
        // Wait for the server to start
        console.log('Waiting for server to start...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      // Start timer
      const startTime = Date.now();
      
      // Call the API to update the knowledge base
      console.log('Calling API to update knowledge base...');
      const result = await callUpdateAPI();
      
      // Calculate elapsed time
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      console.log('\n=== Knowledge Base Update Summary ===');
      console.log(`Status: ${result.success ? 'Success' : 'Failed'}`);
      console.log(`Message: ${result.message}`);
      
      if (result.stats) {
        console.log('\nUpdate Statistics:');
        console.log(`- Total files in catalog: ${result.stats.totalFiles}`);
        console.log(`- Files processed: ${result.stats.processedFiles}`);
        console.log(`- Files skipped (unchanged): ${result.stats.skippedFiles}`);
        console.log(`- Files deleted: ${result.stats.deletedFiles}`);
        
        if (result.stats.addedChunks !== undefined) {
          console.log(`- Chunks added: ${result.stats.addedChunks}`);
          console.log(`- Chunks removed: ${result.stats.removedChunks}`);
          console.log(`- Chunks unchanged: ${result.stats.unchangedChunks}`);
        }
      }
      
      console.log(`\nUpdate time: ${elapsedTime.toFixed(2)} seconds`);
    } else {
      console.log('\nKnowledge base update skipped. Use without --skip-update to update the knowledge base.');
    }
    
    // Print maintenance summary
    console.log('\n=== Maintenance Summary ===');
    console.log(`- Total files in catalog: ${Object.keys(catalog.files).length}`);
    console.log(`- Temporary files removed: ${stats.temporaryFilesRemoved}`);
    console.log(`- Missing files removed: ${stats.missingFilesRemoved}`);
    console.log(`- Error files reset: ${stats.errorFilesReset}`);
    console.log(`- Metadata issues fixed: ${stats.metadataIssuesFixed}`);
    
    console.log('\nCatalog maintenance completed successfully!');
    
  } catch (error) {
    console.error('Error during catalog maintenance:', error);
    process.exit(1);
  }
}

// Helper function to save the catalog
function saveCatalog(catalog, filePath) {
  try {
    // Update the lastUpdated timestamp
    catalog.lastUpdated = new Date().toISOString();
    
    // Write the catalog to file
    fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2));
    console.log(`File catalog saved with ${Object.keys(catalog.files).length} files`);
    return true;
  } catch (error) {
    console.error('Error saving file catalog:', error);
    return false;
  }
}

// Check if the development server is running
function checkServerRunning() {
  try {
    // Try to connect to the server
    const options = {
      host: API_HOST,
      port: API_PORT,
      path: '/',
      method: 'HEAD',
      timeout: 2000
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        resolve(res.statusCode < 400);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    return false;
  }
}

// Start the development server
function startDevServer() {
  try {
    // Start the server in the background
    const child = require('child_process').spawn('npm', ['run', 'dev'], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Unref the child process so it can run independently
    child.unref();
    
    console.log('Development server started in the background');
    return true;
  } catch (error) {
    console.error('Error starting development server:', error);
    return false;
  }
}

// Call the API to update the knowledge base
function callUpdateAPI() {
  return new Promise((resolve, reject) => {
    // Prepare the request data
    const data = JSON.stringify({
      secretKey: API_SECRET_KEY
    });
    
    // Prepare the request options
    const options = {
      host: API_HOST,
      port: API_PORT,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    // Make the request
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`API request failed: ${error.message}`));
    });
    
    // Send the request
    req.write(data);
    req.end();
  });
}

main().catch(console.error); 