/**
 * File Catalog Types
 * 
 * This file contains type definitions for the file catalog system
 * which tracks metadata for all files processed by the RAG system.
 */

/**
 * Represents metadata for a single file in the knowledge base
 */
export interface FileMetadata {
  id: string;                 // Unique identifier for the file
  name: string;               // Original filename
  mimeType: string;           // MIME type of the file
  size: number;               // File size in bytes
  lastModified: string;       // ISO timestamp of last modification
  sourceLocation: 'google-drive' | 'manual-upload'; // Where the file came from
  driveId?: string;           // Google Drive ID if applicable
  contentHash?: string;       // Hash of content for deduplication
  
  // Processing metadata
  processingStatus: 'pending' | 'success' | 'error';
  errorMessage?: string;      // Error details if processing failed
  processedAt?: string;       // When the file was last processed
  
  // Chunking metadata
  chunkCount: number;         // Number of chunks created
  chunkIds: string[];         // Vector DB IDs of chunks
}

/**
 * Represents the entire file catalog
 */
export interface FileCatalog {
  lastUpdated: string;        // ISO timestamp of last catalog update
  files: Record<string, FileMetadata>; // Map of file IDs to metadata
} 