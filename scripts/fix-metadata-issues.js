#!/usr/bin/env node

/**
 * This script fixes metadata issues in the file catalog:
 * 1. Reduces metadata size for files exceeding the limit
 * 2. Removes temporary files from the catalog (not just filesystem)
 * 3. Cleans up references to missing files
 * 4. Fixes content extraction issues
 */

const fs = require('fs');
const path = require('path');

// Paths
const KNOWLEDGEBASE_DIR = path.join(process.cwd(), 'knowledgebase');
const FILE_CATALOG_PATH = path.join(process.cwd(), 'file-catalog.json');
const DATA_CATALOG_PATH = path.join(process.cwd(), 'data', 'file-catalog.json');

// Constants
const MAX_METADATA_SIZE = 49152; // 48KB
const MAX_DESCRIPTION_LENGTH = 100;
const MAX_KEYWORDS = 5;
const MAX_CONTENT_TAGS = 5;

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

// Calculate the size of metadata for a file
function calculateMetadataSize(fileMetadata) {
  return Buffer.byteLength(JSON.stringify(fileMetadata));
}

// Reduce metadata size for a file
function reduceMetadataSize(fileMetadata) {
  const originalSize = calculateMetadataSize(fileMetadata);
  
  // Make a copy to avoid modifying the original
  const reducedMetadata = { ...fileMetadata };
  
  // Step 1: Truncate description
  if (reducedMetadata.description) {
    reducedMetadata.description = reducedMetadata.description.substring(0, MAX_DESCRIPTION_LENGTH);
  }
  
  // Step 2: Limit keywords
  if (reducedMetadata.keywords && Array.isArray(reducedMetadata.keywords)) {
    reducedMetadata.keywords = reducedMetadata.keywords.slice(0, MAX_KEYWORDS);
  }
  
  // Step 3: Limit content tags
  if (reducedMetadata.contentTags && Array.isArray(reducedMetadata.contentTags)) {
    reducedMetadata.contentTags = reducedMetadata.contentTags.slice(0, MAX_CONTENT_TAGS);
  }
  
  // Step 4: Remove version history if present
  if (reducedMetadata.versionHistory) {
    delete reducedMetadata.versionHistory;
  }
  
  // Step 5: Reduce chunk count for very large files
  if (reducedMetadata.chunkCount > 20) {
    reducedMetadata.chunkCount = 20;
  }
  
  // Step 6: Remove any custom fields that might be taking up space
  const essentialFields = [
    'id', 'name', 'path', 'size', 'mimeType', 'fileType', 'sourceLocation', 'driveId',
    'processingStatus', 'processedAt', 'errorMessage', 'chunkCount', 'chunkIds',
    'contentHash', 'createdAt', 'lastModified', 'author', 'title', 'contentTags',
    'keywords', 'description', 'version'
  ];
  
  Object.keys(reducedMetadata).forEach(key => {
    if (!essentialFields.includes(key)) {
      delete reducedMetadata[key];
    }
  });
  
  const newSize = calculateMetadataSize(reducedMetadata);
  console.log(`Reduced metadata size for ${fileMetadata.name} from ${originalSize} to ${newSize} bytes`);
  
  return reducedMetadata;
}

// Remove temporary files from the catalog
function removeTemporaryFilesFromCatalog(catalog) {
  let removedCount = 0;
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    
    // Check if it's a temporary file
    if (file.name.startsWith('~$')) {
      console.log(`Removing temporary file from catalog: ${file.path ? file.path + '/' : ''}${file.name}`);
      delete catalog.files[fileId];
      removedCount++;
    }
  }
  
  console.log(`Removed ${removedCount} temporary files from catalog`);
  return removedCount;
}

// Remove temporary files from the filesystem
function removeTemporaryFilesFromFilesystem() {
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
  
  console.log('Scanning for temporary files in filesystem...');
  scanForTempFiles(KNOWLEDGEBASE_DIR);
  console.log(`Removed ${removedCount} temporary files from filesystem`);
  
  return removedCount;
}

// Clean up missing files from the catalog
function cleanupMissingFiles(catalog) {
  let missingCount = 0;
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    
    // Check if the file exists
    if (!fileExists(file.name, file.path || '')) {
      console.log(`File not found in knowledgebase: ${file.path ? file.path + '/' : ''}${file.name}`);
      
      // If it's a temporary file, remove it from the catalog
      if (file.name.startsWith('~$')) {
        console.log(`Removing missing temporary file from catalog: ${file.path ? file.path + '/' : ''}${file.name}`);
        delete catalog.files[fileId];
        missingCount++;
      } else {
        // For non-temporary files, mark as error but keep in catalog
        file.processingStatus = 'error';
        file.errorMessage = 'File not found in knowledgebase';
        missingCount++;
      }
    }
  }
  
  console.log(`Processed ${missingCount} missing files`);
  return missingCount;
}

// Fix metadata size issues
function fixMetadataSizeIssues(catalog) {
  let fixedCount = 0;
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    
    // Check if the file has a metadata size error
    if (file.processingStatus === 'error' && 
        file.errorMessage && 
        file.errorMessage.includes('Exceeded max metadata size')) {
      
      console.log(`Fixing metadata size issue for: ${file.path ? file.path + '/' : ''}${file.name}`);
      
      // Reduce metadata size
      const reducedMetadata = reduceMetadataSize(file);
      
      // Update the file with reduced metadata
      Object.assign(file, reducedMetadata);
      
      // Reset processing status
      file.processingStatus = 'pending';
      file.errorMessage = '';
      
      fixedCount++;
    }
  }
  
  console.log(`Fixed metadata size issues for ${fixedCount} files`);
  return fixedCount;
}

// Fix content extraction issues
function fixContentExtractionIssues(catalog) {
  let fixedCount = 0;
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    
    // Check if the file has a content extraction error
    if (file.processingStatus === 'error' && 
        file.errorMessage && 
        file.errorMessage.includes('No content extracted from file')) {
      
      // Skip temporary files
      if (file.name.startsWith('~$')) {
        continue;
      }
      
      console.log(`Fixing content extraction issue for: ${file.path ? file.path + '/' : ''}${file.name}`);
      
      // Reset processing status
      file.processingStatus = 'pending';
      file.errorMessage = '';
      
      // Set a reasonable chunk count to help with processing
      if (!file.chunkCount || file.chunkCount === 0) {
        file.chunkCount = 1;
      }
      
      fixedCount++;
    }
  }
  
  console.log(`Fixed content extraction issues for ${fixedCount} files`);
  return fixedCount;
}

// Main function
async function main() {
  console.log('Starting metadata fix process...');
  
  // Load the file catalog
  const { path: catalogPath, catalog } = loadFileCatalog();
  console.log(`Loaded file catalog with ${Object.keys(catalog.files).length} files from ${catalogPath}`);
  
  // Track statistics
  let errorCount = 0;
  let metadataSizeIssues = 0;
  let contentExtractionIssues = 0;
  let missingFiles = 0;
  let tempFilesRemoved = 0;
  let fixedCount = 0;
  
  // Count files with errors
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    if (file.processingStatus === 'error') {
      errorCount++;
      
      // Categorize errors
      if (file.errorMessage && file.errorMessage.includes('Exceeded max metadata size')) {
        metadataSizeIssues++;
      } else if (file.errorMessage && file.errorMessage.includes('No content extracted from file')) {
        contentExtractionIssues++;
      }
    }
  }
  
  console.log(`Found ${errorCount} files with errors:`);
  console.log(`- Metadata size issues: ${metadataSizeIssues}`);
  console.log(`- Content extraction issues: ${contentExtractionIssues}`);
  
  // Remove temporary files from filesystem
  const removedFromFs = removeTemporaryFilesFromFilesystem();
  
  // Remove temporary files from catalog
  const removedFromCatalog = removeTemporaryFilesFromCatalog(catalog);
  tempFilesRemoved = removedFromCatalog;
  
  // Clean up missing files
  missingFiles = cleanupMissingFiles(catalog);
  
  // Fix metadata size issues
  const fixedMetadataSize = fixMetadataSizeIssues(catalog);
  
  // Fix content extraction issues
  const fixedContentExtraction = fixContentExtractionIssues(catalog);
  
  // Calculate total fixed
  fixedCount = fixedMetadataSize + fixedContentExtraction;
  
  // Save the catalog if files were fixed
  if (fixedCount > 0 || tempFilesRemoved > 0) {
    console.log(`Fixed ${fixedCount} files with errors`);
    saveFileCatalog(catalogPath, catalog);
  } else {
    console.log('No files needed fixing');
  }
  
  // Print summary
  console.log('\nSummary:');
  console.log(`- Total files in catalog: ${Object.keys(catalog.files).length}`);
  console.log(`- Files with errors: ${errorCount}`);
  console.log(`- Metadata size issues: ${metadataSizeIssues}`);
  console.log(`- Content extraction issues: ${contentExtractionIssues}`);
  console.log(`- Missing files: ${missingFiles}`);
  console.log(`- Temporary files removed: ${tempFilesRemoved}`);
  console.log(`- Files fixed: ${fixedCount}`);
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 