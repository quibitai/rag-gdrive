/**
 * DOCX Document Loader
 * 
 * This loader extracts text from DOCX files using the mammoth library.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { Document } from '@langchain/core/documents';
import { DocumentLoader, BaseDocumentMetadata, DocumentLoadingError } from './base-loader';

export class DocxLoader implements DocumentLoader {
  private filePath: string;
  private fileId?: string;
  
  /**
   * Create a new DOCX loader
   * @param filePath Path to the DOCX file
   * @param fileId Optional ID from the file catalog
   */
  constructor(filePath: string, fileId?: string) {
    this.filePath = filePath;
    this.fileId = fileId;
  }
  
  /**
   * Load documents from the DOCX file
   * @returns Promise resolving to an array of Document objects
   */
  async load(): Promise<Document[]> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.filePath)) {
        throw new DocumentLoadingError(`File does not exist: ${this.filePath}`, this.filePath);
      }
      
      // Read the file as a buffer
      const buffer = fs.readFileSync(this.filePath);
      
      // Use mammoth to extract text
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value || '';
      
      if (!text) {
        console.warn(`Warning: No text extracted from DOCX file ${this.filePath}`);
      }
      
      // Create document with metadata
      const fileName = path.basename(this.filePath);
      const metadata: BaseDocumentMetadata = {
        source: this.filePath,
        fileName,
        fileType: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
      console.error(`Error loading DOCX file ${this.filePath}:`, error);
      throw new DocumentLoadingError(
        error instanceof Error ? error.message : 'Unknown error loading DOCX',
        this.filePath
      );
    }
  }
} 