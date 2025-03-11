/**
 * PDF Document Loader
 * 
 * This loader extracts text from PDF files using the PDFLoader from LangChain.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Document } from '@langchain/core/documents';
import { PDFLoader as LangChainPDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocumentLoader, BaseDocumentMetadata, DocumentLoadingError } from './base-loader';

export class PDFLoader implements DocumentLoader {
  private filePath: string;
  private fileId?: string;
  
  /**
   * Create a new PDF loader
   * @param filePath Path to the PDF file
   * @param fileId Optional ID from the file catalog
   */
  constructor(filePath: string, fileId?: string) {
    this.filePath = filePath;
    this.fileId = fileId;
  }
  
  /**
   * Load documents from the PDF file
   * @returns Promise resolving to an array of Document objects
   */
  async load(): Promise<Document[]> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.filePath)) {
        throw new DocumentLoadingError(`File does not exist: ${this.filePath}`, this.filePath);
      }
      
      // Use LangChain's PDFLoader
      const loader = new LangChainPDFLoader(this.filePath);
      const docs = await loader.load();
      
      // Enhance documents with additional metadata
      const fileName = path.basename(this.filePath);
      const enhancedDocs = docs.map((doc, index) => {
        const metadata: BaseDocumentMetadata = {
          ...doc.metadata,
          source: this.filePath,
          fileName,
          fileType: 'pdf',
          mimeType: 'application/pdf',
          fileId: this.fileId,
          pageNumber: doc.metadata.loc?.pageNumber || index + 1,
          totalPages: docs.length,
          createdAt: new Date().toISOString()
        };
        
        return new Document({
          pageContent: doc.pageContent,
          metadata
        });
      });
      
      return enhancedDocs;
    } catch (error) {
      console.error(`Error loading PDF file ${this.filePath}:`, error);
      throw new DocumentLoadingError(
        error instanceof Error ? error.message : 'Unknown error loading PDF',
        this.filePath
      );
    }
  }
} 