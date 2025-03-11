/**
 * File Catalog Utilities
 * 
 * This file contains utilities for managing the file catalog,
 * which tracks metadata for all files processed by the RAG system.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { FileCatalog, FileMetadata } from '../types/file-catalog';

// Path to the file catalog JSON file
const CATALOG_PATH = path.join(process.cwd(), 'file-catalog.json');

/**
 * Loads the file catalog from disk
 * Creates a new empty catalog if none exists
 */
export const loadFileCatalog = (): FileCatalog => {
  if (!fs.existsSync(CATALOG_PATH)) {
    return { lastUpdated: new Date().toISOString(), files: {} };
  }
  
  try {
    const catalogData = fs.readFileSync(CATALOG_PATH, 'utf-8');
    
    // Handle migration from old array format to new object format
    const parsedData = JSON.parse(catalogData);
    
    // If the catalog is in the old array format, migrate it
    if (Array.isArray(parsedData)) {
      console.log('Migrating file catalog from array to object format');
      const migratedCatalog: FileCatalog = {
        lastUpdated: new Date().toISOString(),
        files: {}
      };
      
      parsedData.forEach(oldEntry => {
        const id = uuidv4();
        migratedCatalog.files[id] = {
          id,
          name: oldEntry.filename,
          mimeType: getMimeTypeFromExtension(oldEntry.type),
          size: oldEntry.size,
          lastModified: new Date().toISOString(),
          sourceLocation: 'google-drive', // Assuming all existing files are from Google Drive
          processingStatus: 'success',
          processedAt: new Date().toISOString(),
          chunkCount: oldEntry.documentCount || 0,
          chunkIds: []
        };
      });
      
      // Save the migrated catalog
      saveFileCatalog(migratedCatalog);
      return migratedCatalog;
    }
    
    return parsedData as FileCatalog;
  } catch (error) {
    console.error('Error loading file catalog:', error);
    return { lastUpdated: new Date().toISOString(), files: {} };
  }
};

/**
 * Saves the file catalog to disk
 */
export const saveFileCatalog = (catalog: FileCatalog): void => {
  try {
    // Update the lastUpdated timestamp
    catalog.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    console.log('File catalog saved to', CATALOG_PATH);
  } catch (error) {
    console.error('Error saving file catalog:', error);
  }
};

/**
 * Adds a file to the file catalog
 */
export const addFileToFileCatalog = (
  filePath: string, 
  mimeType: string, 
  size: number, 
  sourceLocation: 'google-drive' | 'manual-upload',
  driveId?: string
): FileMetadata => {
  const catalog = loadFileCatalog();
  const fileId = uuidv4();
  const fileName = path.basename(filePath);
  
  // Check if file already exists by name and driveId
  const existingFile = Object.values(catalog.files).find(file => 
    file.name === fileName && 
    (driveId ? file.driveId === driveId : true)
  );
  
  if (existingFile) {
    console.log(`File ${fileName} already exists in catalog, updating metadata`);
    
    // Update existing file metadata
    existingFile.size = size;
    existingFile.lastModified = new Date().toISOString();
    existingFile.processingStatus = 'pending';
    
    saveFileCatalog(catalog);
    return existingFile;
  }
  
  // Create new file metadata
  const fileMetadata: FileMetadata = {
    id: fileId,
    name: fileName,
    mimeType,
    size,
    lastModified: new Date().toISOString(),
    sourceLocation,
    driveId,
    processingStatus: 'pending',
    chunkCount: 0,
    chunkIds: []
  };
  
  catalog.files[fileId] = fileMetadata;
  saveFileCatalog(catalog);
  return fileMetadata;
};

/**
 * Updates file metadata in the catalog
 */
export const updateFileMetadata = (fileId: string, updates: Partial<FileMetadata>): FileMetadata | null => {
  const catalog = loadFileCatalog();
  
  if (!catalog.files[fileId]) {
    console.error(`File with ID ${fileId} not found in catalog`);
    return null;
  }
  
  catalog.files[fileId] = {
    ...catalog.files[fileId],
    ...updates,
    lastModified: new Date().toISOString()
  };
  
  saveFileCatalog(catalog);
  return catalog.files[fileId];
};

/**
 * Removes a file from the catalog
 */
export const removeFileFromCatalog = (fileId: string): boolean => {
  const catalog = loadFileCatalog();
  
  if (!catalog.files[fileId]) {
    console.error(`File with ID ${fileId} not found in catalog`);
    return false;
  }
  
  delete catalog.files[fileId];
  saveFileCatalog(catalog);
  return true;
};

/**
 * Calculates a hash of the file contents for deduplication
 */
export const calculateFileHash = (filePath: string): string => {
  try {
    const fileContent = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileContent.toString('binary'));
    return hashSum.digest('hex');
  } catch (error) {
    console.error(`Error calculating hash for ${filePath}:`, error);
    return '';
  }
};

/**
 * Gets MIME type from file extension
 */
export const getMimeTypeFromExtension = (extension: string): string => {
  const mimeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'gdoc': 'application/vnd.google-apps.document',
    'html': 'text/html',
    'htm': 'text/html',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml'
  };
  
  return mimeMap[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Checks for file changes in a directory and updates the catalog
 * Returns information about which files need processing
 */
export const checkForFileChanges = (
  directoryPath: string,
  supportedFileFilter: (filename: string) => boolean
): {
  filesToProcess: string[];
  filesToSkip: string[];
  deletedFileIds: string[];
} => {
  // Load the catalog
  const catalog = loadFileCatalog();
  
  // Initialize result sets
  const filesToProcess: string[] = [];
  const filesToSkip: string[] = [];
  const deletedFileIds: string[] = Object.keys(catalog.files);
  
  // Get all files in the directory
  const files = fs.readdirSync(directoryPath)
    .filter(file => !fs.statSync(path.join(directoryPath, file)).isDirectory())
    .filter(supportedFileFilter);
  
  // Check each file for changes
  for (const fileName of files) {
    const filePath = path.join(directoryPath, fileName);
    
    try {
      // Get file stats
      const stats = fs.statSync(filePath);
      
      // Calculate content hash
      const contentHash = calculateFileHash(filePath);
      
      // Get MIME type from extension
      const extension = path.extname(fileName).substring(1);
      const mimeType = getMimeTypeFromExtension(extension);
      
      // Find if file exists in catalog by name
      const existingFile = Object.values(catalog.files).find(file => file.name === fileName);
      
      if (existingFile) {
        // Remove from deleted files list
        const index = deletedFileIds.indexOf(existingFile.id);
        if (index !== -1) {
          deletedFileIds.splice(index, 1);
        }
        
        // Check if file has changed
        if (existingFile.contentHash !== contentHash || 
            existingFile.size !== stats.size || 
            existingFile.processingStatus === 'error') {
          
          // Update file metadata
          updateFileMetadata(existingFile.id, {
            size: stats.size,
            contentHash,
            processingStatus: 'pending',
            lastModified: new Date().toISOString()
          });
          
          filesToProcess.push(fileName);
        } else {
          filesToSkip.push(fileName);
        }
      } else {
        // New file, add to catalog
        const fileMetadata = addFileToFileCatalog(
          filePath,
          mimeType,
          stats.size,
          'manual-upload' // Default to manual upload
        );
        
        // Update content hash
        updateFileMetadata(fileMetadata.id, {
          contentHash
        });
        
        filesToProcess.push(fileName);
      }
    } catch (error) {
      console.error(`Error checking file ${fileName}:`, error);
      filesToProcess.push(fileName); // Process anyway to be safe
    }
  }
  
  // Save the updated catalog
  saveFileCatalog(catalog);
  
  return {
    filesToProcess,
    filesToSkip,
    deletedFileIds
  };
}; 