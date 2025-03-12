#!/usr/bin/env node

/**
 * This script identifies and fixes file processing errors in the file catalog:
 * 1. Resets processing status for files with errors
 * 2. Removes temporary files (like those starting with ~$)
 * 3. Handles files that exceed metadata size limits
 * 4. Cleans up pending files that might be stuck
 * 
 * The script will only run when:
 * - The knowledgebase has been updated since the last run
 * - There are files with errors in the catalog
 * - OR if the --force flag is used
 */

const fs = require('fs');
const path = require('path');

// Paths
const KNOWLEDGEBASE_DIR = path.join(process.cwd(), 'knowledgebase');
const FILE_CATALOG_PATH = path.join(process.cwd(), 'file-catalog.json');
const DATA_CATALOG_PATH = path.join(process.cwd(), 'data', 'file-catalog.json');
const LAST_RUN_PATH = path.join(process.cwd(), '.file-error-fix-last-run.json');

// Parse command line arguments
const args = process.argv.slice(2);
const FORCE_RUN = args.includes('--force');

// Load the file catalog
function loadFileCatalog() {
  try {
    // Try the root directory first
    if (fs.existsSync(FILE_CATALOG_PATH)) {
      const data = fs.readFileSync(FILE_CATALOG_PATH, 'utf8');
      return { path: FILE_CATALOG_PATH, catalog: JSON.parse(data) };
    }
    
    // Try the data directory next
    if (fs.existsSync(DATA_CATALOG_PATH)) {
      const data = fs.readFileSync(DATA_CATALOG_PATH, 'utf8');
      return { path: DATA_CATALOG_PATH, catalog: JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading file catalog:', error);
  }
  
  throw new Error('File catalog not found');
}

// Save the file catalog
function saveFileCatalog(catalogPath, catalog) {
  try {
    // Update the lastUpdated timestamp
    catalog.lastUpdated = new Date().toISOString();
    
    // Ensure the directory exists
    const dir = path.dirname(catalogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the catalog to file
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    console.log(`File catalog saved with ${Object.keys(catalog.files).length} files`);
    return true;
  } catch (error) {
    console.error('Error saving file catalog:', error);
    return false;
  }
}

// Check if a file exists in the knowledgebase
function fileExists(fileName, relativePath) {
  const filePath = path.join(KNOWLEDGEBASE_DIR, relativePath, fileName);
  return fs.existsSync(filePath);
}

// Remove temporary files from the knowledgebase
function removeTemporaryFiles() {
  let removedCount = 0;
  
  function scanForTempFiles(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        scanForTempFiles(itemPath);
      } else if (stats.isFile()) {
        // Check if it's a temporary file
        if (item.startsWith('~$')) {
          try {
            fs.unlinkSync(itemPath);
            console.log(`Removed temporary file: ${itemPath}`);
            removedCount++;
          } catch (error) {
            console.error(`Error removing temporary file ${itemPath}:`, error);
          }
        }
      }
    }
  }
  
  console.log('Scanning for temporary files...');
  scanForTempFiles(KNOWLEDGEBASE_DIR);
  console.log(`Removed ${removedCount} temporary files`);
  
  return removedCount;
}

// Get the last run information
function getLastRunInfo() {
  try {
    if (fs.existsSync(LAST_RUN_PATH)) {
      const data = fs.readFileSync(LAST_RUN_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading last run info:', error);
  }
  
  // Return default values if file doesn't exist or there's an error
  return {
    lastRunTime: null,
    lastCatalogUpdateTime: null
  };
}

// Save the last run information
function saveLastRunInfo(catalogLastUpdated) {
  try {
    const lastRunInfo = {
      lastRunTime: new Date().toISOString(),
      lastCatalogUpdateTime: catalogLastUpdated
    };
    
    fs.writeFileSync(LAST_RUN_PATH, JSON.stringify(lastRunInfo, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving last run info:', error);
    return false;
  }
}

// Check if the knowledgebase has been updated since the last run
function hasKnowledgebaseUpdated(catalog, lastRunInfo) {
  if (!lastRunInfo.lastCatalogUpdateTime) {
    return true; // First run, so consider it as updated
  }
  
  const catalogLastUpdated = new Date(catalog.lastUpdated || 0);
  const lastRunCatalogTime = new Date(lastRunInfo.lastCatalogUpdateTime || 0);
  
  return catalogLastUpdated > lastRunCatalogTime;
}

// Count the number of files with errors in the catalog
function countFilesWithErrors(catalog) {
  let errorCount = 0;
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    if (file.processingStatus === 'error') {
      errorCount++;
    }
  }
  
  return errorCount;
}

// Main function
async function main() {
  console.log('Checking if file error fix is needed...');
  
  // Load the file catalog
  const { path: catalogPath, catalog } = loadFileCatalog();
  console.log(`Loaded file catalog with ${Object.keys(catalog.files).length} files from ${catalogPath}`);
  
  // Get the last run information
  const lastRunInfo = getLastRunInfo();
  
  // Check if the knowledgebase has been updated
  const knowledgebaseUpdated = hasKnowledgebaseUpdated(catalog, lastRunInfo);
  
  // Count files with errors
  const errorCount = countFilesWithErrors(catalog);
  
  // Determine if we should run the fix
  const shouldRun = FORCE_RUN || (knowledgebaseUpdated && errorCount > 0);
  
  if (!shouldRun) {
    console.log('No need to run file error fix:');
    if (!knowledgebaseUpdated) {
      console.log('- Knowledgebase has not been updated since last run');
    }
    if (errorCount === 0) {
      console.log('- No files with errors found in the catalog');
    }
    console.log('Use --force flag to run anyway');
    return;
  }
  
  console.log(`Found ${errorCount} files with errors. Starting file error fix process...`);
  
  // Remove temporary files first
  const removedTempFiles = removeTemporaryFiles();
  
  // Track statistics
  let pendingCount = 0;
  let missingCount = 0;
  let oversizedCount = 0;
  let fixedCount = 0;
  
  // Process each file in the catalog
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    
    // Check for files with errors
    if (file.processingStatus === 'error') {
      // Check if the file exists
      if (!fileExists(file.name, file.path)) {
        console.log(`File not found in knowledgebase: ${file.path}/${file.name}`);
        missingCount++;
        continue;
      }
      
      // Check for temporary files
      if (file.name.startsWith('~$')) {
        console.log(`Skipping temporary file: ${file.path}/${file.name}`);
        continue;
      }
      
      // Check for error message indicating metadata size limit
      if (file.errorMessage && file.errorMessage.includes('Exceeded max metadata size')) {
        console.log(`File exceeds metadata size limit: ${file.path}/${file.name}`);
        oversizedCount++;
        
        // For oversized files, we can try to reduce chunk count
        if (file.chunkCount > 10) {
          file.chunkCount = 10; // Limit chunks to reduce metadata size
          console.log(`Reduced chunk count for oversized file: ${file.path}/${file.name}`);
        }
      }
      
      // Reset the processing status
      file.processingStatus = 'pending';
      file.errorMessage = '';
      fixedCount++;
      console.log(`Reset processing status for: ${file.path}/${file.name}`);
    }
    
    // Check for stuck pending files (older than 1 hour)
    if (file.processingStatus === 'pending') {
      pendingCount++;
      
      // Check if the file has been pending for too long
      const lastModified = new Date(file.lastModified);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastModified < oneHourAgo) {
        // This file might be stuck in pending state
        console.log(`File stuck in pending state: ${file.path}/${file.name}`);
        
        // Reset the processing status
        file.processingStatus = 'pending';
        file.errorMessage = '';
        fixedCount++;
        console.log(`Reset processing status for stuck file: ${file.path}/${file.name}`);
      }
    }
  }
  
  // Save the catalog if files were fixed
  if (fixedCount > 0 || removedTempFiles > 0) {
    console.log(`Fixed ${fixedCount} files with errors`);
    saveFileCatalog(catalogPath, catalog);
    
    // Save the last run information
    saveLastRunInfo(catalog.lastUpdated);
  } else {
    console.log('No files needed fixing');
  }
  
  // Print summary
  console.log('\nSummary:');
  console.log(`- Total files in catalog: ${Object.keys(catalog.files).length}`);
  console.log(`- Files with errors: ${errorCount}`);
  console.log(`- Files in pending state: ${pendingCount}`);
  console.log(`- Missing files: ${missingCount}`);
  console.log(`- Oversized files: ${oversizedCount}`);
  console.log(`- Temporary files removed: ${removedTempFiles}`);
  console.log(`- Files fixed: ${fixedCount}`);
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 