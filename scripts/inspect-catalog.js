#!/usr/bin/env node

/**
 * This script inspects the file catalog structure and checks for any issues
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

// Check if a file exists in the knowledgebase
function fileExists(fileName, relativePath) {
  const filePath = path.join(KNOWLEDGEBASE_DIR, relativePath || '', fileName);
  return fs.existsSync(filePath);
}

// Main function
async function main() {
  console.log('Inspecting file catalog...');
  
  // Load the file catalog
  const { path: catalogPath, catalog } = loadFileCatalog();
  console.log(`Loaded file catalog with ${Object.keys(catalog.files).length} files from ${catalogPath}`);
  
  // Check catalog structure
  console.log('\nCatalog Structure:');
  console.log('- lastUpdated:', catalog.lastUpdated);
  console.log('- files count:', Object.keys(catalog.files).length);
  
  // Sample a few files
  console.log('\nSample Files:');
  const fileIds = Object.keys(catalog.files);
  const sampleSize = Math.min(5, fileIds.length);
  
  for (let i = 0; i < sampleSize; i++) {
    const fileId = fileIds[i];
    const file = catalog.files[fileId];
    console.log(`\nFile ${i+1}:`);
    console.log('- id:', fileId);
    console.log('- name:', file.name);
    console.log('- path:', file.path || '(root)');
    console.log('- processingStatus:', file.processingStatus);
    console.log('- exists in knowledgebase:', fileExists(file.name, file.path));
    
    // Check full path
    const fullPath = path.join(KNOWLEDGEBASE_DIR, file.path || '', file.name);
    console.log('- full path:', fullPath);
    console.log('- exists at full path:', fs.existsSync(fullPath));
  }
  
  // Count files by processing status
  const statusCounts = {};
  for (const fileId in catalog.files) {
    const status = catalog.files[fileId].processingStatus || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  
  console.log('\nProcessing Status Counts:');
  for (const status in statusCounts) {
    console.log(`- ${status}: ${statusCounts[status]}`);
  }
  
  // Check for files with errors
  const filesWithErrors = [];
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    if (file.processingStatus === 'error') {
      filesWithErrors.push({
        id: fileId,
        name: file.name,
        path: file.path || '(root)',
        errorMessage: file.errorMessage || 'Unknown error'
      });
    }
  }
  
  console.log('\nFiles with Errors:');
  console.log(`Found ${filesWithErrors.length} files with errors`);
  
  if (filesWithErrors.length > 0) {
    console.log('\nSample Error Files:');
    const sampleSize = Math.min(5, filesWithErrors.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const file = filesWithErrors[i];
      console.log(`\nError File ${i+1}:`);
      console.log('- id:', file.id);
      console.log('- name:', file.name);
      console.log('- path:', file.path);
      console.log('- errorMessage:', file.errorMessage);
      console.log('- exists in knowledgebase:', fileExists(file.name, file.path));
    }
  }
  
  // Check for missing files
  let missingCount = 0;
  const missingFiles = [];
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    if (!fileExists(file.name, file.path)) {
      missingCount++;
      missingFiles.push({
        id: fileId,
        name: file.name,
        path: file.path || '(root)'
      });
    }
  }
  
  console.log('\nMissing Files:');
  console.log(`Found ${missingCount} missing files`);
  
  if (missingCount > 0) {
    console.log('\nSample Missing Files:');
    const sampleSize = Math.min(5, missingFiles.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const file = missingFiles[i];
      console.log(`\nMissing File ${i+1}:`);
      console.log('- id:', file.id);
      console.log('- name:', file.name);
      console.log('- path:', file.path);
      
      // Check if the directory exists
      const dirPath = path.join(KNOWLEDGEBASE_DIR, file.path || '');
      console.log('- directory exists:', fs.existsSync(dirPath));
      
      // Check full path
      const fullPath = path.join(KNOWLEDGEBASE_DIR, file.path || '', file.name);
      console.log('- full path:', fullPath);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 