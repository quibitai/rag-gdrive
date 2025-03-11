"use server";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { store } from "@/lib/vector";
import { redis } from "@/lib/redis";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getFilenames, removeAndCreateFolder } from "@/utils/utils";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { Document } from "@langchain/core/documents";
import * as mammoth from "mammoth";
import { UnstructuredClient } from "unstructured-client";

const credentialFilename = "service-credentials.json";
const scopes = ["https://www.googleapis.com/auth/drive"];
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const rootDirectory = process.cwd();
const folderName = "knowledgebase";
const getRandomNumber = () => Math.random() * 1000000;

const dirPath = "knowledgebase";
// Update to support multiple file extensions
const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.gdoc'];
const supportedMimeTypes = [
  'application/pdf',                                                // PDF
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain',                                                     // TXT
  'text/markdown',                                                  // MD
  'application/vnd.google-apps.document'                            // Google Docs
];

// Initialize the Unstructured client
// Note: You'll need to sign up for an API key at https://app.unstructured.io
const unstructuredClient = new UnstructuredClient({
  api_key_auth: process.env.UNSTRUCTURED_API_KEY || "",
});

// Helper function to get file extension from name
const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase();
};

// Helper function to determine the appropriate loader for a file
const getDocumentLoader = (filePath: string) => {
  const extension = getFileExtension(filePath);
  
  switch (extension) {
    case '.pdf':
      return new PDFLoader(filePath);
    case '.docx':
      // Custom loader for DOCX using mammoth
      return {
        load: async () => {
          try {
            const buffer = fs.readFileSync(filePath);
            const result = await mammoth.extractRawText({ buffer });
            const text = result.value || "";
            
            return [
              new Document({
                pageContent: text,
                metadata: { source: filePath },
              }),
            ];
          } catch (error) {
            console.error(`Error processing DOCX file ${filePath}:`, error);
            return [];
          }
        },
      };
    case '.txt':
    case '.md':
      // Simple text loader
      return {
        load: async () => {
          try {
            const text = fs.readFileSync(filePath, "utf-8");
            return [
              new Document({
                pageContent: text,
                metadata: { source: filePath },
              }),
            ];
          } catch (error) {
            console.error(`Error processing text file ${filePath}:`, error);
            return [];
          }
        },
      };
    default:
      // For unknown types, try to read as text
      return {
        load: async () => {
          try {
            const text = fs.readFileSync(filePath, "utf-8");
            return [
              new Document({
                pageContent: text,
                metadata: { source: filePath },
              }),
            ];
          } catch (error) {
            console.error(`Error processing unknown file type ${filePath}:`, error);
            return [];
          }
        },
      };
  }
};

// Interface for Google Drive file
interface DriveFile {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
}

const isSupportedFileType = (file: DriveFile): boolean => {
  // Skip files without names
  if (!file.name) {
    return false;
  }
  
  const extension = getFileExtension(file.name);
  // Support common file types that our loaders can handle
  return ['.pdf', '.docx', '.txt', '.md'].includes(extension);
};

export const fetchDataFromDriveAndSaveLocally = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialFilename,
      scopes: scopes,
    });
    console.log(`FETCHING ALL SUPPORTED FILES FROM DRIVE (Folder ID: ${folderId})`);
    
    if (!folderId) {
      console.error("GOOGLE_DRIVE_FOLDER_ID environment variable is not set");
      throw new Error("Google Drive folder ID is not configured");
    }
    
    // Initialize Google Drive API
    const drive = google.drive({ version: "v3", auth });

    // First let's check what files are visible to our service account in general
    console.log("Checking all files visible to service account...");
    const allFilesResponse = await drive.files.list({
      pageSize: 100,
      fields: "files(name, id, mimeType, parents)",
    });
    
    console.log("All visible files:", JSON.stringify(allFilesResponse.data.files, null, 2));

    // Now let's check for files specifically in our target folder with a more permissive query
    console.log(`Looking for files in folder: ${folderId}`);
    const response = await drive.files.list({
      pageSize: 1000,
      fields: "files(name, id, mimeType, size)",
      q: `'${folderId}' in parents`, // Removed mimeType filter to see ALL files in the folder
    });
    
    console.log("Files in folder:", JSON.stringify(response.data.files, null, 2));
    
    const files = response.data.files || [];

    if (files.length === 0) {
      console.error("No files found in the specified Google Drive folder");
      throw new Error("No files found in Google Drive folder");
    }
    
    // Filter to only use supported file types for processing
    const supportedFiles = files.filter((file: DriveFile) => {
      // Skip files without names
      if (!file.name) return false;
      
      return supportedMimeTypes.includes(file.mimeType || '') || 
        supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    });
    
    console.log(`Found ${files.length} total files, ${supportedFiles.length} supported files in Google Drive folder`);
    
    if (supportedFiles.length === 0) {
      console.error("No supported files found in the folder. Found other files, but none are in supported formats.");
      throw new Error("No supported files found in Google Drive folder");
    }
    
    // Ensure the knowledgebase directory exists
    const knowledgebasePath = path.join(rootDirectory, folderName);
    if (!fs.existsSync(knowledgebasePath)) {
      fs.mkdirSync(knowledgebasePath, { recursive: true });
      console.log(`Created knowledgebase directory at ${knowledgebasePath}`);
    }

    // Array to hold all download promises
    const downloadPromises = [];

    for (const file of supportedFiles) {
      if (!file.id || !file.name) {
        console.error("File missing ID or name:", file);
        continue;
      }

      const fileId = file.id;
      const fileName = file.name;
      const fileMimeType = file.mimeType || '';
      
      console.log(`Downloading file: ${fileName} (ID: ${fileId}, Type: ${fileMimeType})`);
      
      const downloadPromise = new Promise<void>(async (resolve, reject) => {
        try {
          // Special handling for Google Docs - export as DOCX
          let destPath: string;
          
          if (fileMimeType === 'application/vnd.google-apps.document') {
            // For Google Docs, export as DOCX
            const baseFileName = fileName.replace(/\.[^/.]+$/, ""); // Remove any extension
            destPath = path.join(
              rootDirectory,
              folderName,
              `${baseFileName}.docx` // Add .docx extension
            );
            
            console.log(`Exporting Google Doc to: ${destPath}`);
            const destStream = fs.createWriteStream(destPath);
            
            try {
              const fileResponse = await drive.files.export({
                fileId: fileId,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              }, {
                responseType: "stream"
              });
              
              if (!fileResponse || !fileResponse.data) {
                console.error(`Error exporting Google Doc ${fileName}: Response is undefined`);
                reject(`Failed to export Google Doc ${fileName}`);
                return;
              }
              
              let receivedBytes = 0;
              
              fileResponse.data
                .on("data", (chunk: Buffer) => {
                  receivedBytes += chunk.length;
                })
                .on("error", (err: Error) => {
                  console.error(`Error exporting Google Doc ${fileName}:`, err);
                  reject(`Failed to export Google Doc ${fileName}: ${err.message}`);
                })
                .pipe(destStream);
                
              destStream.on("finish", () => {
                // Verify the file was actually written
                if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
                  console.log(`Google Doc ${fileName} exported successfully (${receivedBytes} bytes)`);
                  resolve();
                } else {
                  console.error(`Google Doc ${fileName} export failed - output file is empty or missing`);
                  reject(`Google Doc ${fileName} export failed - output file is empty or missing`);
                }
              });
              
              destStream.on("error", (err) => {
                console.error(`Error writing exported Google Doc ${fileName}:`, err);
                reject(`Failed to write exported Google Doc ${fileName}: ${err.message}`);
              });
            } catch (error) {
              console.error(`Error exporting Google Doc ${fileName}:`, error);
              reject(`Error exporting Google Doc ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
            }
          } else {
            // For regular files, download directly
            destPath = path.join(
              rootDirectory,
              folderName,
              fileName
            );
            
            console.log(`Saving to: ${destPath}`);
            const destStream = fs.createWriteStream(destPath);
            
            try {
              const fileResponse = await drive.files.get({
                fileId: fileId,
                alt: "media"
              }, {
                responseType: "stream"
              });
              
              if (!fileResponse || !fileResponse.data) {
                console.error(`Error downloading file ${fileName}: File stream is undefined`);
                reject(`Failed to download file ${fileName}`);
                return;
              }
              
              let receivedBytes = 0;
              
              fileResponse.data
                .on("data", (chunk: Buffer) => {
                  receivedBytes += chunk.length;
                })
                .on("error", (err: Error) => {
                  console.error(`Error downloading file ${fileName}:`, err);
                  reject(`Failed to download file ${fileName}: ${err.message}`);
                })
                .pipe(destStream);
                
              destStream.on("finish", () => {
                // Verify the file was actually written
                if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
                  console.log(`File ${fileName} downloaded successfully (${receivedBytes} bytes)`);
                  resolve();
                } else {
                  console.error(`File ${fileName} download failed - output file is empty or missing`);
                  reject(`File ${fileName} download failed - output file is empty or missing`);
                }
              });
              
              destStream.on("error", (err) => {
                console.error(`Error writing file ${fileName}:`, err);
                reject(`Failed to write file ${fileName}: ${err.message}`);
              });
            } catch (error) {
              console.error(`Error downloading file ${fileName}:`, error);
              reject(`Error downloading file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        } catch (error) {
          console.error(`Error processing file ${fileName}:`, error);
          reject(`Error processing file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });

      // Add the download promise to the array
      downloadPromises.push(downloadPromise);
    }

    await Promise.all(downloadPromises);
    
    // Verify files were actually downloaded
    const downloadedFiles = fs.readdirSync(path.join(rootDirectory, folderName));
    console.log(`Found ${downloadedFiles.length} files in knowledgebase directory after download`);
    
    if (downloadedFiles.length === 0) {
      console.error("Download reported success but no files found in knowledgebase directory");
      throw new Error("Files download reported success but no files found");
    }
    
    console.log("ALL SUPPORTED FILES downloaded successfully");
    
  } catch (error) {
    console.error("Error fetching files from Google Drive:", error);
    throw error;
  }
};

export const generateBotVectorData = async () => {
  console.log("Clearing the vector and Redis DB.");
  // clear the vector store
  await store.delete({ deleteAll: true });
  // clear the redis db
  await redis.flushall();

  console.log("GENERATING THE FILENAMES FROM KNOWLEDGEBASE");
  // Get all files regardless of extension
  const fileNames = getFilenames(dirPath);
  
  if (fileNames.length === 0) {
    console.log("No files found in knowledgebase directory. Check your Google Drive folder.");
    return;
  }

  // Filter to only supported extensions
  const supportedFiles = fileNames.filter(file => 
    supportedExtensions.some(ext => file.toLowerCase().endsWith(ext))
  );

  console.log(`Found ${supportedFiles.length} supported files to process`);
  console.log("MAPPING OVER THE FILES AND STORING INTO VECTOR DATABASE");
  
  // Create a file catalog to track all files
  const fileCatalog: Array<{
    filename: string;
    type: string;
    size: number;
    documentCount: number;
  }> = [];
  
  for await (const fileName of supportedFiles) {
    console.log(`Processing file: ${fileName}`);
    try {
      // Use the appropriate loader based on file extension
      const loader = getDocumentLoader(`${dirPath}/${fileName}`);
      const docs = await loader.load();
      
      if (docs.length === 0) {
        console.log(`No content extracted from ${fileName}`);
        continue;
      }
      
      console.log(`Extracted ${docs.length} document(s) from ${fileName}`);
      console.log(`Preview of content: ${docs[0].pageContent.slice(0, 100)}...`);
      
      // Add metadata to include source filename
      docs.forEach((doc: Document) => {
        doc.metadata.source = fileName;
        // Add a content hash to help with deduplication
        doc.metadata.contentHash = Buffer.from(doc.pageContent.slice(0, 1000)).toString('base64');
      });
      
      // Add to file catalog
      fileCatalog.push({
        filename: fileName,
        type: path.extname(fileName).toLowerCase().replace('.', ''),
        size: fs.statSync(path.join(dirPath, fileName)).size,
        documentCount: docs.length,
      });
      
      // Create Splitter with smaller chunks for better retrieval
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const doc_chunks = await splitter.splitDocuments(docs);
      console.log(`Split into ${doc_chunks.length} chunks`);

      console.log(`SAVING ${doc_chunks.length} CHUNKS FROM ${fileName} TO VECTOR DATABASE`);
      // store the chunks in upstash vector db
      try {
        await store.addDocuments(doc_chunks);
        console.log(`Successfully saved chunks from ${fileName}`);
      } catch (error) {
        console.error(`Error saving chunks from ${fileName}:`, error);
      }
    } catch (error) {
      console.error(`Error processing file ${fileName}:`, error);
    }
  }
  
  // Save the file catalog for future reference
  const catalogPath = path.join(rootDirectory, 'file-catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(fileCatalog, null, 2));
  console.log(`File catalog saved to ${catalogPath}`);
  
  console.log("ALL DOCUMENTS ARE SAVED IN VECTOR DATABASE");
};

// Add this new function to check for manually placed files
export const checkManuallyPlacedFiles = () => {
  const manualFilesPath = path.join(rootDirectory, folderName);
  
  if (!fs.existsSync(manualFilesPath)) {
    fs.mkdirSync(manualFilesPath, { recursive: true });
    return false;
  }
  
  const files = fs.readdirSync(manualFilesPath);
  const supportedFiles = files.filter(file => 
    supportedExtensions.some(ext => file.toLowerCase().endsWith(ext))
  );
  
  console.log(`Found ${supportedFiles.length} manually placed supported files in the knowledgebase folder`);
  return supportedFiles.length > 0;
};

// Modify the generateEmbeddings function to try manual files if Google Drive fails
export const generateEmbeddings = async () => {
  try {
    // Clear the folder
    removeAndCreateFolder();
    
    // First try to fetch data from Google Drive
    try {
      await fetchDataFromDriveAndSaveLocally();
    } catch (driveError) {
      console.error("Error fetching from Google Drive:", driveError);
      
      // Check if there are manually placed files
      const hasManualFiles = checkManuallyPlacedFiles();
      
      if (!hasManualFiles) {
        console.log("No manual files found. Please place supported files in the 'knowledgebase' folder manually.");
        throw new Error("No supported files available. Please manually place files in the knowledgebase folder.");
      } else {
        console.log("Using manually placed files instead of Google Drive.");
      }
    }
    
    // Generate the embeddings
    await generateBotVectorData();
  } catch (error) {
    console.error("Error in embedding generation:", error);
    throw error;
  }
};
