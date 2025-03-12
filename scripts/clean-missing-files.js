#!/usr/bin/env node

/**
 * This script cleans up missing files from the file catalog:
 * 1. Identifies files that no longer exist in the knowledgebase
 * 2. Removes them from the catalog
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
  const exists = fs.existsSync(filePath);
  
  // For debugging
  if (!exists && process.argv.includes('--debug')) {
    console.log(`Checking file: ${filePath} - Exists: ${exists}`);
  }
  
  return exists;
}

// Clean up missing files from the catalog
function cleanupMissingFiles(catalog, removeAll = false) {
  let missingCount = 0;
  let removedCount = 0;
  const missingFiles = [];
  
  console.log('Checking for missing files in the catalog...');
  
  // Debug info
  if (process.argv.includes('--debug')) {
    console.log(`Knowledgebase directory: ${KNOWLEDGEBASE_DIR}`);
    console.log(`Number of files in catalog: ${Object.keys(catalog.files).length}`);
  }
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    
    // Check if the file exists
    if (!fileExists(file.name, file.path)) {
      missingCount++;
      const filePath = `${file.path ? file.path + '/' : ''}${file.name}`;
      missingFiles.push(filePath);
      
      if (removeAll || (file.processingStatus === 'error' && file.errorMessage && 
          (file.errorMessage.includes('No content extracted from file') || 
           file.errorMessage.includes('Invalid PDF structure') ||
           file.errorMessage.includes('File not found')))) {
        // Remove the file from the catalog
        console.log(`Removing missing file from catalog: ${filePath}`);
        delete catalog.files[fileId];
        removedCount++;
      } else {
        // Only remove temporary files and mark others as error
        if (file.name.startsWith('~$')) {
          console.log(`Removing temporary file from catalog: ${filePath}`);
          delete catalog.files[fileId];
          removedCount++;
        } else {
          // Mark as error but keep in catalog
          file.processingStatus = 'error';
          file.errorMessage = 'File not found in knowledgebase';
        }
      }
    }
  }
  
  console.log(`Found ${missingCount} missing files`);
  console.log(`Removed ${removedCount} files from catalog`);
  
  // Log the first 10 missing files for reference
  if (missingFiles.length > 0) {
    console.log('\nSample of missing files:');
    missingFiles.slice(0, 10).forEach(file => console.log(`- ${file}`));
    
    if (missingFiles.length > 10) {
      console.log(`... and ${missingFiles.length - 10} more`);
    }
  }
  
  return { missingCount, removedCount };
}

// Main function
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const removeAll = args.includes('--remove-all');
  const removeErrors = args.includes('--remove-errors');
  
  console.log('Starting missing files cleanup process...');
  if (removeAll) {
    console.log('Will remove ALL missing files from catalog');
  } else if (removeErrors) {
    console.log('Will remove missing files with errors from catalog');
  } else {
    console.log('Will only remove temporary missing files');
  }
  
  // Load the file catalog
  const { path: catalogPath, catalog } = loadFileCatalog();
  console.log(`Loaded file catalog with ${Object.keys(catalog.files).length} files from ${catalogPath}`);
  
  // Clean up missing files
  const { missingCount, removedCount } = cleanupMissingFiles(catalog, removeAll || removeErrors);
  
  // Save the catalog if files were removed
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} missing files from catalog`);
    saveFileCatalog(catalogPath, catalog);
  } else {
    console.log('No files were removed from the catalog');
  }
  
  // Print summary
  console.log('\nSummary:');
  console.log(`- Total files in catalog: ${Object.keys(catalog.files).length}`);
  console.log(`- Missing files found: ${missingCount}`);
  console.log(`- Files removed from catalog: ${removedCount}`);
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 