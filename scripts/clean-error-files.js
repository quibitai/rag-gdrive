#!/usr/bin/env node

/**
 * This script cleans up files with errors from the file catalog:
 * 1. Identifies files with error status
 * 2. Removes them from the catalog or resets their status
 * 3. Updates the catalog with the cleaned data
 */

const fs = require('fs');
const path = require('path');

// Paths
const KNOWLEDGEBASE_DIR = path.join(process.cwd(), 'knowledgebase');
const FILE_CATALOG_PATH = path.join(process.cwd(), 'file-catalog.json');
const DATA_CATALOG_PATH = path.join(process.cwd(), 'data', 'file-catalog.json');

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
  const filePath = path.join(KNOWLEDGEBASE_DIR, relativePath || '', fileName);
  return fs.existsSync(filePath);
}

// Clean up files with errors from the catalog
function cleanupErrorFiles(catalog, removeAll = false, resetStatus = false) {
  let errorCount = 0;
  let removedCount = 0;
  let resetCount = 0;
  const errorFiles = [];
  
  console.log('Checking for files with errors in the catalog...');
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    
    // Check if the file has an error status
    if (file.processingStatus === 'error') {
      errorCount++;
      const filePath = `${file.path ? file.path + '/' : ''}${file.name}`;
      errorFiles.push({
        id: fileId,
        path: filePath,
        exists: fileExists(file.name, file.path),
        errorMessage: file.errorMessage || 'Unknown error'
      });
      
      if (removeAll) {
        // Remove the file from the catalog
        console.log(`Removing error file from catalog: ${filePath}`);
        delete catalog.files[fileId];
        removedCount++;
      } else if (resetStatus) {
        // Reset the processing status
        console.log(`Resetting processing status for: ${filePath}`);
        file.processingStatus = 'pending';
        file.errorMessage = '';
        resetCount++;
      } else if (!fileExists(file.name, file.path) || 
                file.errorMessage.includes('No content extracted from file') || 
                file.errorMessage.includes('Invalid PDF structure') ||
                file.errorMessage.includes('File not found')) {
        // Remove files that don't exist or have specific errors
        console.log(`Removing non-existent error file from catalog: ${filePath}`);
        delete catalog.files[fileId];
        removedCount++;
      }
    }
  }
  
  console.log(`Found ${errorCount} files with errors`);
  console.log(`Removed ${removedCount} files from catalog`);
  console.log(`Reset ${resetCount} files to pending status`);
  
  // Log the first 10 error files for reference
  if (errorFiles.length > 0) {
    console.log('\nSample of error files:');
    errorFiles.slice(0, 10).forEach(file => {
      console.log(`- ${file.path} (Exists: ${file.exists}, Error: ${file.errorMessage})`);
    });
    
    if (errorFiles.length > 10) {
      console.log(`... and ${errorFiles.length - 10} more`);
    }
  }
  
  return { errorCount, removedCount, resetCount };
}

// Main function
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const removeAll = args.includes('--remove-all');
  const resetStatus = args.includes('--reset-status');
  
  console.log('Starting error files cleanup process...');
  if (removeAll) {
    console.log('Will remove ALL files with errors from catalog');
  } else if (resetStatus) {
    console.log('Will reset processing status for files with errors');
  } else {
    console.log('Will remove non-existent files with errors from catalog');
  }
  
  // Load the file catalog
  const { path: catalogPath, catalog } = loadFileCatalog();
  console.log(`Loaded file catalog with ${Object.keys(catalog.files).length} files from ${catalogPath}`);
  
  // Clean up error files
  const { errorCount, removedCount, resetCount } = cleanupErrorFiles(catalog, removeAll, resetStatus);
  
  // Save the catalog if files were removed or reset
  if (removedCount > 0 || resetCount > 0) {
    console.log(`Removed ${removedCount} files and reset ${resetCount} files`);
    saveFileCatalog(catalogPath, catalog);
  } else {
    console.log('No changes were made to the catalog');
  }
  
  // Print summary
  console.log('\nSummary:');
  console.log(`- Total files in catalog: ${Object.keys(catalog.files).length}`);
  console.log(`- Files with errors: ${errorCount}`);
  console.log(`- Files removed from catalog: ${removedCount}`);
  console.log(`- Files reset to pending: ${resetCount}`);
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 