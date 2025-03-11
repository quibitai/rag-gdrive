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
  
  // First check if file exists by driveId (for Google Drive files)
  // This handles the case where a file was renamed in Google Drive
  let existingFile: FileMetadata | undefined;
  
  if (driveId && sourceLocation === 'google-drive') {
    existingFile = Object.values(catalog.files).find(file => 
      file.driveId === driveId && file.sourceLocation === 'google-drive'
    );
    
    if (existingFile && existingFile.name !== fileName) {
      console.log(`File renamed in Google Drive: ${existingFile.name} -> ${fileName}`);
    }
  }
  
  // If not found by driveId, check by filename
  if (!existingFile) {
    existingFile = Object.values(catalog.files).find(file => 
      file.name === fileName && 
      (driveId ? file.driveId === driveId : true)
    );
  }
  
  if (existingFile) {
    console.log(`File ${fileName} already exists in catalog, updating metadata`);
    
    // Update existing file metadata
    existingFile.name = fileName; // Update name in case it was renamed
    existingFile.size = size;
    existingFile.lastModified = new Date().toISOString();
    existingFile.processingStatus = 'pending';
    existingFile.driveId = driveId; // Ensure driveId is updated
    
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
      let existingFile = Object.values(catalog.files).find(file => file.name === fileName);
      
      // If not found by name, it might be a renamed file
      // We'll check for this when processing deletedFileIds later
      
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
  
  // Check if any "deleted" files are actually just renamed files
  // This is a best-effort approach for manually uploaded files
  // For Google Drive files, the driveId handling in addFileToFileCatalog will take care of renames
  const potentiallyRenamedFiles = deletedFileIds.filter(id => {
    const file = catalog.files[id];
    return file && file.sourceLocation === 'manual-upload' && file.contentHash;
  });
  
  if (potentiallyRenamedFiles.length > 0) {
    console.log(`Checking ${potentiallyRenamedFiles.length} potentially renamed files`);
    
    for (const fileId of potentiallyRenamedFiles) {
      const oldFile = catalog.files[fileId];
      
      // Look for a file with the same content hash but different name
      const newFileName = files.find(fileName => {
        const filePath = path.join(directoryPath, fileName);
        const hash = calculateFileHash(filePath);
        return hash === oldFile.contentHash;
      });
      
      if (newFileName) {
        console.log(`Detected renamed file: ${oldFile.name} -> ${newFileName}`);
        
        // Update the file metadata with the new name
        updateFileMetadata(fileId, {
          name: newFileName,
          processingStatus: 'pending'
        });
        
        // Remove from deleted files list
        const index = deletedFileIds.indexOf(fileId);
        if (index !== -1) {
          deletedFileIds.splice(index, 1);
        }
        
        // Add to files to process
        if (!filesToProcess.includes(newFileName)) {
          filesToProcess.push(newFileName);
        }
      }
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