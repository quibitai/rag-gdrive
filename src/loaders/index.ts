/**
 * Document Loader Factory
 * 
 * This file exports a factory function to get the appropriate document loader
 * based on file type, as well as re-exports all loader classes.
 */

import * as path from 'path';
import { DocumentLoader } from './base-loader';
import { PDFLoader } from './pdf-loader';
import { DocxLoader } from './docx-loader';
import { TextLoader } from './text-loader';

// Re-export all loaders
export * from './base-loader';
export * from './pdf-loader';
export * from './docx-loader';
export * from './text-loader';

/**
 * Get the appropriate document loader for a file
 * @param filePath Path to the file
 * @param fileId Optional ID from the file catalog
 * @returns A document loader instance
 */
export const getDocumentLoader = (filePath: string, fileId?: string): DocumentLoader => {
  const extension = path.extname(filePath).toLowerCase();
  
  switch (extension) {
    case '.pdf':
      return new PDFLoader(filePath, fileId);
    case '.docx':
      return new DocxLoader(filePath, fileId);
    case '.txt':
    case '.md':
      return new TextLoader(filePath, fileId);
    default:
      // For unknown types, try to read as text
      console.warn(`No specific loader for extension ${extension}, using TextLoader as fallback`);
      return new TextLoader(filePath, fileId);
  }
};

/**
 * Check if a file type is supported
 * @param filePath Path to the file
 * @returns True if the file type is supported
 */
export const isSupportedFileType = (filePath: string): boolean => {
  if (!filePath) return false;
  
  const extension = path.extname(filePath).toLowerCase();
  const supportedExtensions = ['.pdf', '.docx', '.txt', '.md'];
  
  return supportedExtensions.includes(extension);
};

/**
 * Get MIME type from file extension
 * @param filePath Path to the file
 * @returns MIME type string
 */
export const getMimeTypeFromPath = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml'
  };
  
  return mimeMap[extension] || 'application/octet-stream';
}; 