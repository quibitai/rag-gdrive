/**
 * Text Document Loader
 * 
 * This loader extracts text from plain text files (TXT, MD, etc.).
 */

import * as fs from 'fs';
import * as path from 'path';
import { Document } from '@langchain/core/documents';
import { DocumentLoader, BaseDocumentMetadata, DocumentLoadingError } from './base-loader';

export class TextLoader implements DocumentLoader {
  private filePath: string;
  private fileId?: string;
  
  /**
   * Create a new text loader
   * @param filePath Path to the text file
   * @param fileId Optional ID from the file catalog
   */
  constructor(filePath: string, fileId?: string) {
    this.filePath = filePath;
    this.fileId = fileId;
  }
  
  /**
   * Load documents from the text file
   * @returns Promise resolving to an array of Document objects
   */
  async load(): Promise<Document[]> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.filePath)) {
        throw new DocumentLoadingError(`File does not exist: ${this.filePath}`, this.filePath);
      }
      
      // Read the file as text
      const text = fs.readFileSync(this.filePath, 'utf-8');
      
      if (!text) {
        console.warn(`Warning: Empty text file ${this.filePath}`);
      }
      
      // Determine file type from extension
      const fileName = path.basename(this.filePath);
      const extension = path.extname(this.filePath).toLowerCase();
      const fileType = extension.replace('.', ''); // Remove the dot
      
      // Determine MIME type
      let mimeType = 'text/plain';
      if (extension === '.md') {
        mimeType = 'text/markdown';
      }
      
      // Create document with metadata
      const metadata: BaseDocumentMetadata = {
        source: this.filePath,
        fileName,
        fileType,
        mimeType,
        fileId: this.fileId,
        pageNumber: 1,
        totalPages: 1,
        createdAt: new Date().toISOString()
      };
      
      return [
        new Document({
          pageContent: text,
          metadata
        })
      ];
    } catch (error) {
      console.error(`Error loading text file ${this.filePath}:`, error);
      throw new DocumentLoadingError(
        error instanceof Error ? error.message : 'Unknown error loading text file',
        this.filePath
      );
    }
  }
} 