#!/usr/bin/env node

/**
 * fix-file-paths.js v2.1
 * 
 * This script fixes file paths in the catalog to ensure they maintain the proper folder structure.
 * It specifically addresses the issue where files from the "Admin/Financials" folder and its subfolders
 * are incorrectly placed in the root directory.
 * 
 * Version 2.1 improvements:
 * - Enhanced error handling
 * - More comprehensive file categorization
 * - Additional logging and statistics
 * - Support for other document types beyond financial documents
 */

const fs = require('fs');
const path = require('path');
const writeFileAtomic = require('write-file-atomic');

// Paths
const CATALOG_PATH = path.join(process.cwd(), 'file-catalog.json');
const KNOWLEDGEBASE_PATH = path.join(process.cwd(), 'knowledgebase');

// Statistics
const stats = {
  totalFiles: 0,
  updatedFiles: 0,
  financialDocs: 0,
  clientDocs: 0,
  otherDocs: 0,
  skippedFiles: 0
};

// Load the file catalog
function loadFileCatalog() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const data = fs.readFileSync(CATALOG_PATH, 'utf8');
      try {
        return JSON.parse(data);
      } catch (parseError) {
        console.error('Error parsing file catalog JSON:', parseError);
        
        // Try to recover from backup if available
        const backupPath = `${CATALOG_PATH}.backup`;
        if (fs.existsSync(backupPath)) {
          console.log('Attempting to recover from backup file');
          try {
            const backupData = fs.readFileSync(backupPath, 'utf-8');
            return JSON.parse(backupData);
          } catch (backupError) {
            console.error('Error recovering from backup:', backupError);
          }
        }
        
        throw new Error('Failed to parse catalog and no valid backup found');
      }
    } else {
      console.warn('File catalog not found at:', CATALOG_PATH);
      return { lastUpdated: new Date().toISOString(), files: {} };
    }
  } catch (error) {
    console.error('Error loading file catalog:', error);
    throw error;
  }
}

// Save the file catalog
function saveFileCatalog(catalog) {
  try {
    // Create a backup of the current file if it exists
    if (fs.existsSync(CATALOG_PATH)) {
      try {
        const currentData = fs.readFileSync(CATALOG_PATH, 'utf-8');
        const backupPath = `${CATALOG_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, '')}`;
        fs.writeFileSync(backupPath, currentData);
        console.log(`Created backup of file catalog at ${backupPath}`);
      } catch (backupError) {
        console.warn('Error creating backup of file catalog:', backupError);
      }
    }
    
    // Write the new catalog data atomically
    writeFileAtomic.sync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    console.log(`File catalog saved with ${Object.keys(catalog.files).length} files`);
  } catch (error) {
    console.error('Error saving file catalog:', error);
    throw error;
  }
}

// Check if a file is a financial document based on its name
function isFinancialDocument(fileName) {
  const financialKeywords = [
    'invoice', 'billing', 'payment', 'receipt', 'estimate', 'quote', 
    'contract', 'agreement', 'financial', 'budget', 'expense', 'revenue',
    'inv_', 'est_', 'bill_', 'pay_', 'vendor', 'client', 'form', 'prof',
    'professional', 'w-9', 'w9', 'tax', 'insurance', 'policy'
  ];
  
  const lowerFileName = fileName.toLowerCase();
  return financialKeywords.some(keyword => lowerFileName.includes(keyword));
}

// Check if a file is a client document based on its name
function isClientDocument(fileName) {
  const clientKeywords = [
    'client', 'project', 'brief', 'proposal', 'scope', 'sow', 'work',
    'deliverable', 'timeline', 'milestone', 'presentation', 'report',
    'analysis', 'research', 'strategy', 'plan', 'campaign', 'marketing'
  ];
  
  const lowerFileName = fileName.toLowerCase();
  return clientKeywords.some(keyword => lowerFileName.includes(keyword));
}

// Determine the appropriate subfolder for a financial document
function determineFinancialSubfolder(fileName) {
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.includes('invoice') || lowerFileName.includes('inv_') || 
      lowerFileName.includes('bill') || lowerFileName.includes('payment') || 
      lowerFileName.includes('receipt')) {
    return 'Billing';
  } else if (lowerFileName.includes('estimate') || lowerFileName.includes('est_') || 
             lowerFileName.includes('quote') || lowerFileName.includes('proposal')) {
    return 'Estimates_and_Quotes';
  } else if (lowerFileName.includes('vendor') || lowerFileName.includes('supplier') || 
             lowerFileName.includes('w-9') || lowerFileName.includes('w9')) {
    return 'VENDORS_accounts';
  } else if (lowerFileName.includes('employee') || lowerFileName.includes('staff') || 
             lowerFileName.includes('contractor') || lowerFileName.includes('freelancer')) {
    return 'Employees_and_Contractors';
  } else if (lowerFileName.includes('insurance') || lowerFileName.includes('policy') || 
             lowerFileName.includes('coverage')) {
    return 'Insurance';
  } else if (lowerFileName.includes('gov') || lowerFileName.includes('government') || 
             lowerFileName.includes('tax') || lowerFileName.includes('regulatory')) {
    return 'Government_Documents';
  } else if (lowerFileName.includes('contract') || lowerFileName.includes('agreement') || 
             lowerFileName.includes('legal')) {
    return 'Contracts_and_Agreements';
  } else {
    // Default to Billing for other financial documents
    return 'Billing';
  }
}

// Determine the appropriate path for a client document
function determineClientPath(fileName) {
  const lowerFileName = fileName.toLowerCase();
  
  // Check for specific client names in the filename
  if (lowerFileName.includes('lcba') || lowerFileName.includes('charter_boat') || 
      lowerFileName.includes('charter boat')) {
    return 'ET_Clients/Louisiana_Charter_Boat_Association';
  } else if (lowerFileName.includes('walkons') || lowerFileName.includes('walk-ons')) {
    return 'ET_Clients/Walkons';
  } else if (lowerFileName.includes('relief') || lowerFileName.includes('windows')) {
    return 'ET_Clients/Relief_Windows';
  } else if (lowerFileName.includes('cpra')) {
    return 'ET_Clients/CPRA';
  } else if (lowerFileName.includes('lpb') || lowerFileName.includes('louisiana public')) {
    return 'ET_Clients/LPB';
  } else {
    // Default client path
    return 'ET_Clients/Other_Clients';
  }
}

// Main function
async function main() {
  console.log('=== File Path Fixer v2.1 ===');
  console.log('Fixing file paths in the catalog...');
  
  try {
    // Load the file catalog
    const catalog = loadFileCatalog();
    stats.totalFiles = Object.keys(catalog.files).length;
    console.log(`Loaded file catalog with ${stats.totalFiles} files`);
    
    // Process each file in the catalog
    for (const fileId in catalog.files) {
      const file = catalog.files[fileId];
      
      // Skip files that already have a path
      if (file.path && file.path !== '') {
        stats.skippedFiles++;
        continue;
      }
      
      // Check if this is a financial document that should be in the Admin/Financials folder
      if (isFinancialDocument(file.name)) {
        const subfolder = determineFinancialSubfolder(file.name);
        file.path = `Admin/Financials/${subfolder}`;
        stats.updatedFiles++;
        stats.financialDocs++;
        console.log(`Updated path for ${file.name} to ${file.path}`);
      }
      // Check if this is a client document
      else if (isClientDocument(file.name)) {
        file.path = determineClientPath(file.name);
        stats.updatedFiles++;
        stats.clientDocs++;
        console.log(`Updated path for ${file.name} to ${file.path}`);
      }
      // For other files without a path, put them in a general folder
      else if (!file.path || file.path === '') {
        file.path = 'General_Documents';
        stats.updatedFiles++;
        stats.otherDocs++;
        console.log(`Updated path for ${file.name} to ${file.path}`);
      }
    }
    
    // Save the catalog if files were updated
    if (stats.updatedFiles > 0) {
      console.log(`\nUpdated paths for ${stats.updatedFiles} files:`);
      console.log(`- Financial documents: ${stats.financialDocs}`);
      console.log(`- Client documents: ${stats.clientDocs}`);
      console.log(`- Other documents: ${stats.otherDocs}`);
      console.log(`- Skipped (already had paths): ${stats.skippedFiles}`);
      
      saveFileCatalog(catalog);
      
      // Rebuild the file tree
      console.log('\nFile paths updated. Please restart the server to see the changes.');
    } else {
      console.log('No files needed path updates');
    }
  } catch (error) {
    console.error('\nError processing file catalog:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 