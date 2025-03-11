/**
 * Base Document Loader Interface
 * 
 * This file defines the interface that all document loaders must implement.
 */

import { Document } from '@langchain/core/documents';

/**
 * Interface for document loaders
 */
export interface DocumentLoader {
  /**
   * Load documents from a file
   * @returns Promise resolving to an array of Document objects
   */
  load(): Promise<Document[]>;
}

/**
 * Base metadata for all documents
 */
export interface BaseDocumentMetadata {
  source: string;           // Source file path
  fileName: string;         // Original filename
  fileType: string;         // File type/extension
  mimeType: string;         // MIME type
  fileId?: string;          // ID from file catalog
  pageNumber?: number;      // Page number (for multi-page documents)
  totalPages?: number;      // Total pages (for multi-page documents)
  createdAt: string;        // ISO timestamp of when the document was created
}

/**
 * Error thrown when a document cannot be loaded
 */
export class DocumentLoadingError extends Error {
  constructor(message: string, public readonly filePath: string) {
    super(message);
    this.name = 'DocumentLoadingError';
  }
} 