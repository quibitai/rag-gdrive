// Script to fix the file catalog
const fs = require('fs');
const path = require('path');

// Load the file catalog
const catalogPath = path.join(process.cwd(), 'file-catalog.json');
let catalog;

try {
  const catalogData = fs.readFileSync(catalogPath, 'utf-8');
  catalog = JSON.parse(catalogData);
  console.log(`Loaded file catalog with ${Object.keys(catalog.files || {}).length} files`);
} catch (error) {
  console.error('Error loading file catalog:', error);
  // Create a new catalog if it doesn't exist or is invalid
  catalog = {
    files: {},
    lastUpdated: new Date().toISOString()
  };
  console.log('Created a new file catalog');
}

// Check for files in the knowledgebase directory that aren't in the catalog
const knowledgebasePath = path.join(process.cwd(), 'knowledgebase');

// Create knowledgebase directory if it doesn't exist
if (!fs.existsSync(knowledgebasePath)) {
  fs.mkdirSync(knowledgebasePath, { recursive: true });
  console.log('Created knowledgebase directory');
}

// Function to recursively get all files in a directory
const getAllFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
};

// Get all files in the knowledgebase directory
const allFiles = getAllFiles(knowledgebasePath);
console.log(`Found ${allFiles.length} files in knowledgebase directory`);

// Check each file
let missingFiles = 0;
allFiles.forEach(filePath => {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(knowledgebasePath, path.dirname(filePath));
  const normalizedPath = relativePath === '.' ? '' : relativePath.replace(/\\/g, '/');
  
  // Check if this file is in the catalog
  const fileInCatalog = Object.values(catalog.files || {}).some(file => 
    file.name === fileName && 
    (file.path === normalizedPath || (!file.path && normalizedPath === ''))
  );
  
  if (!fileInCatalog) {
    console.log(`File not in catalog: ${normalizedPath ? normalizedPath + '/' : ''}${fileName}`);
    missingFiles++;
    
    // Add the file to the catalog
    const fileId = require('crypto').randomUUID();
    const stats = fs.statSync(filePath);
    const extension = path.extname(fileName).substring(1).toLowerCase();
    
    // Get MIME type
    const mimeMap = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'md': 'text/markdown'
    };
    const mimeType = mimeMap[extension] || 'application/octet-stream';
    
    // Add to catalog
    catalog.files[fileId] = {
      id: fileId,
      name: fileName,
      path: normalizedPath,
      mimeType,
      size: stats.size,
      lastModified: new Date().toISOString(),
      sourceLocation: 'manual-upload',
      processingStatus: 'pending',
      chunkCount: 0,
      chunkIds: []
    };
  }
});

// Fix the error in knowledgebase-embeddings.ts
// Let's also fix the build error by checking the file
const embedFilePath = path.join(process.cwd(), 'src', 'actions', 'knowledgebase-embeddings.ts');
if (fs.existsSync(embedFilePath)) {
  let embedContent = fs.readFileSync(embedFilePath, 'utf-8');
  
  // Check if the error exists
  if (embedContent.includes('isInFolderHierarchy = await checkParents(currentParents);')) {
    console.log('Found build error in knowledgebase-embeddings.ts, fixing...');
    
    // Replace the problematic code
    embedContent = embedContent.replace(
      'isInFolderHierarchy = await checkParents(currentParents);',
      'isInFolderHierarchy = checkParents(currentParents);'
    );
    
    // Also make sure the checkParents function is not async
    embedContent = embedContent.replace(
      'const checkParents = async (parentIds)',
      'const checkParents = (parentIds)'
    );
    
    // Save the fixed file
    fs.writeFileSync(embedFilePath, embedContent);
    console.log('Fixed build error in knowledgebase-embeddings.ts');
  }
}

// Save the updated catalog
if (missingFiles > 0 || Object.keys(catalog.files || {}).length === 0) {
  catalog.lastUpdated = new Date().toISOString();
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`Updated catalog with ${missingFiles} missing files`);
} else {
  console.log('No missing files found');
}

console.log('Done!'); 