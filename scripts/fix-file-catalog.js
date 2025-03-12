#!/usr/bin/env node

/**
 * This script checks for files in the knowledgebase directory that are missing from the file catalog
 * and adds them to the catalog.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Paths
const KNOWLEDGEBASE_DIR = path.join(process.cwd(), 'knowledgebase');
const FILE_CATALOG_PATH = path.join(process.cwd(), 'data', 'file-catalog.json');

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx', '.doc', '.csv', '.json'];

// Load the file catalog
function loadFileCatalog() {
  try {
    if (fs.existsSync(FILE_CATALOG_PATH)) {
      const data = fs.readFileSync(FILE_CATALOG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading file catalog:', error);
  }
  
  // Return empty catalog if file doesn't exist or there's an error
  return { lastUpdated: new Date().toISOString(), files: {} };
}

// Save the file catalog
function saveFileCatalog(catalog) {
  try {
    // Update the lastUpdated timestamp
    catalog.lastUpdated = new Date().toISOString();
    
    // Ensure the directory exists
    const dir = path.dirname(FILE_CATALOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the catalog to file
    fs.writeFileSync(FILE_CATALOG_PATH, JSON.stringify(catalog, null, 2));
    console.log(`File catalog saved with ${Object.keys(catalog.files).length} files`);
  } catch (error) {
    console.error('Error saving file catalog:', error);
  }
}

// Get file metadata
function getFileMetadata(filePath, relativePath) {
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath).toLowerCase();
  
  // Generate a unique ID for the file
  const fileId = crypto.createHash('md5').update(`${relativePath}/${fileName}`).digest('hex');
  
  return {
    id: fileId,
    name: fileName,
    path: relativePath,
    mimeType: getMimeType(fileExt),
    size: stats.size,
    lastModified: stats.mtime.toISOString(),
    sourceLocation: 'manual-upload',
    processingStatus: 'pending',
    chunkCount: 0
  };
}

// Get MIME type based on file extension
function getMimeType(extension) {
  const mimeTypes = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.csv': 'text/csv',
    '.json': 'application/json'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// Recursively scan directory for files
function scanDirectory(dir, baseDir = '') {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Recursively scan subdirectories
      const subDirPath = baseDir ? `${baseDir}/${item}` : item;
      const subDirFiles = scanDirectory(itemPath, subDirPath);
      files.push(...subDirFiles);
    } else if (stats.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        files.push({
          path: itemPath,
          relativePath: baseDir
        });
      }
    }
  }
  
  return files;
}

// Main function
async function main() {
  console.log('Checking for missing files in the file catalog...');
  
  // Load the file catalog
  const catalog = loadFileCatalog();
  console.log(`Loaded file catalog with ${Object.keys(catalog.files).length} files`);
  
  // Scan the knowledgebase directory for files
  const files = scanDirectory(KNOWLEDGEBASE_DIR);
  console.log(`Found ${files.length} files in the knowledgebase directory`);
  
  // Check for files that are missing from the catalog
  let addedCount = 0;
  for (const file of files) {
    const fileName = path.basename(file.path);
    const fileId = crypto.createHash('md5').update(`${file.relativePath}/${fileName}`).digest('hex');
    
    // Check if the file is already in the catalog
    if (!catalog.files[fileId]) {
      // Add the file to the catalog
      const metadata = getFileMetadata(file.path, file.relativePath);
      catalog.files[fileId] = metadata;
      addedCount++;
      console.log(`Added ${fileName} to the catalog`);
    }
  }
  
  // Save the catalog if files were added
  if (addedCount > 0) {
    console.log(`Added ${addedCount} files to the catalog`);
    saveFileCatalog(catalog);
  } else {
    console.log('No missing files found in the catalog');
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 