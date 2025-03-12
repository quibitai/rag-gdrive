#!/usr/bin/env node

/**
 * This script generates an HTML dashboard for monitoring the RAG chatbot system
 */

const fs = require('fs');
const path = require('path');

// Paths
const KNOWLEDGEBASE_DIR = path.join(process.cwd(), 'knowledgebase');
const FILE_CATALOG_PATH = path.join(process.cwd(), 'file-catalog.json');
const DATA_CATALOG_PATH = path.join(process.cwd(), 'data', 'file-catalog.json');
const DASHBOARD_PATH = path.join(process.cwd(), 'dashboard.html');

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

// Get file statistics
function getFileStats() {
  const { catalog } = loadFileCatalog();
  
  // Count files by status
  const statusCounts = {};
  let errorFiles = [];
  let pendingFiles = [];
  let missingFiles = [];
  
  for (const fileId in catalog.files) {
    const file = catalog.files[fileId];
    const status = file.processingStatus || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    // Collect error files
    if (status === 'error') {
      errorFiles.push({
        name: file.name,
        path: file.path || '(root)',
        errorMessage: file.errorMessage || 'Unknown error'
      });
    }
    
    // Collect pending files
    if (status === 'pending') {
      pendingFiles.push({
        name: file.name,
        path: file.path || '(root)'
      });
    }
    
    // Check for missing files
    if (!fileExists(file.name, file.path)) {
      missingFiles.push({
        name: file.name,
        path: file.path || '(root)'
      });
    }
  }
  
  // Sort error files by name
  errorFiles.sort((a, b) => a.name.localeCompare(b.name));
  
  // Limit to 10 files for display
  errorFiles = errorFiles.slice(0, 10);
  pendingFiles = pendingFiles.slice(0, 10);
  missingFiles = missingFiles.slice(0, 10);
  
  return {
    totalFiles: Object.keys(catalog.files).length,
    lastUpdated: catalog.lastUpdated,
    statusCounts,
    errorFiles,
    pendingFiles,
    missingFiles
  };
}

// Generate HTML dashboard
function generateDashboard() {
  const stats = getFileStats();
  
  // Format date
  const lastUpdated = new Date(stats.lastUpdated).toLocaleString();
  
  // Generate error files HTML
  let errorFilesHtml = '';
  if (stats.errorFiles.length > 0) {
    errorFilesHtml = `
      <table>
        <tr>
          <th>File</th>
          <th>Error</th>
        </tr>
        ${stats.errorFiles.map(file => `
          <tr>
            <td>${file.path}/${file.name}</td>
            <td>${file.errorMessage}</td>
          </tr>
        `).join('')}
      </table>
      ${stats.statusCounts.error > 10 ? `<p>... and ${stats.statusCounts.error - 10} more</p>` : ''}
    `;
  } else {
    errorFilesHtml = '<p>No files with errors</p>';
  }
  
  // Generate pending files HTML
  let pendingFilesHtml = '';
  if (stats.pendingFiles.length > 0) {
    pendingFilesHtml = `
      <ul>
        ${stats.pendingFiles.map(file => `<li>${file.path}/${file.name}</li>`).join('')}
      </ul>
      ${stats.statusCounts.pending > 10 ? `<p>... and ${stats.statusCounts.pending - 10} more</p>` : ''}
    `;
  } else {
    pendingFilesHtml = '<p>No pending files</p>';
  }
  
  // Generate missing files HTML
  let missingFilesHtml = '';
  if (stats.missingFiles.length > 0) {
    missingFilesHtml = `
      <ul>
        ${stats.missingFiles.map(file => `<li>${file.path}/${file.name}</li>`).join('')}
      </ul>
      ${stats.missingFiles.length > 10 ? `<p>... and ${stats.missingFiles.length - 10} more</p>` : ''}
    `;
  } else {
    missingFilesHtml = '<p>No missing files</p>';
  }
  
  // Generate HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>RAG Chatbot Status</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
    .card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 15px; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .success { color: green; }
    .error { color: red; }
    .pending { color: orange; }
    .unknown { color: gray; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; }
    table, th, td { border: 1px solid #ddd; }
    th, td { padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .status-bar { display: flex; height: 20px; border-radius: 3px; overflow: hidden; margin-top: 10px; }
    .status-bar div { height: 100%; }
    .timestamp { color: #777; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>RAG Chatbot Status Dashboard</h1>
  
  <div class="card">
    <h2>File Catalog Overview</h2>
    <p>Total Files: <strong>${stats.totalFiles}</strong></p>
    <p class="timestamp">Last Updated: ${lastUpdated}</p>
    
    <div class="status-counts">
      <p class="success">Success: ${stats.statusCounts.success || 0} files (${Math.round((stats.statusCounts.success || 0) / stats.totalFiles * 100)}%)</p>
      <p class="error">Error: ${stats.statusCounts.error || 0} files (${Math.round((stats.statusCounts.error || 0) / stats.totalFiles * 100)}%)</p>
      <p class="pending">Pending: ${stats.statusCounts.pending || 0} files (${Math.round((stats.statusCounts.pending || 0) / stats.totalFiles * 100)}%)</p>
      <p class="unknown">Unknown: ${stats.statusCounts.unknown || 0} files (${Math.round((stats.statusCounts.unknown || 0) / stats.totalFiles * 100)}%)</p>
    </div>
    
    <div class="status-bar">
      <div class="success" style="width: ${Math.round((stats.statusCounts.success || 0) / stats.totalFiles * 100)}%;"></div>
      <div class="error" style="width: ${Math.round((stats.statusCounts.error || 0) / stats.totalFiles * 100)}%;"></div>
      <div class="pending" style="width: ${Math.round((stats.statusCounts.pending || 0) / stats.totalFiles * 100)}%;"></div>
      <div class="unknown" style="width: ${Math.round((stats.statusCounts.unknown || 0) / stats.totalFiles * 100)}%;"></div>
    </div>
  </div>
  
  <div class="card">
    <h2>Files with Errors</h2>
    ${errorFilesHtml}
  </div>
  
  <div class="card">
    <h2>Pending Files</h2>
    ${pendingFilesHtml}
  </div>
  
  <div class="card">
    <h2>Missing Files</h2>
    ${missingFilesHtml}
  </div>
  
  <div class="card">
    <h2>Maintenance Actions</h2>
    <p>Run these commands to fix issues:</p>
    <ul>
      <li><code>node scripts/maintain-catalog.js</code> - Perform basic maintenance</li>
      <li><code>node scripts/clean-error-files.js</code> - Clean up files with errors</li>
      <li><code>node scripts/fix-metadata-issues.js</code> - Fix metadata size issues</li>
    </ul>
  </div>
  
  <p class="timestamp">Dashboard generated on ${new Date().toLocaleString()}</p>
</body>
</html>
  `;
  
  // Write to file
  fs.writeFileSync(DASHBOARD_PATH, html);
  console.log(`Dashboard generated: ${DASHBOARD_PATH}`);
}

// Main function
function main() {
  try {
    generateDashboard();
  } catch (error) {
    console.error('Error generating dashboard:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 