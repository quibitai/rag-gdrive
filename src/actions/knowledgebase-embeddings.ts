"use server";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { store } from "@/lib/vector";
import { redis } from "@/lib/redis";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getFilenames, removeAndCreateFolder } from "@/utils/utils";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const credentialFilename = "service-credentials.json";
const scopes = ["https://www.googleapis.com/auth/drive"];
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const rootDirectory = process.cwd();
const folderName = "knowledgebase";
const getRandomNumber = () => Math.random() * 1000000;

const dirPath = "knowledgebase";
const extension = ".pdf";

export const fetchDataFromDriveAndSaveLocally = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialFilename,
    scopes: scopes,
  });
  console.log("FETCH ALL PDFs FROM DRIVE");
  // Initialize Google Drive API
  const drive = google.drive({ version: "v3", auth });

  // Fetch files from the specified folder
  const response = await drive.files.list({
    pageSize: 1000,
    fields: "files(name, id)",
    q: `'${folderId}' in parents and mimeType='application/pdf'`, // Filter by the specified folder ID
  });
  const files = response.data.files;

  if (!files) {
    throw new Error("No files");
  }
  // Array to hold all download promises
  const downloadPromises = [];

  for (const file of files) {
    const downloadPromise = new Promise<void>((resolve, reject) => {
      // Download each file and save it to the folderName folder
      const destPath = path.join(
        rootDirectory,
        folderName,
        file.name || "file" + getRandomNumber()
      );
      const destStream = fs.createWriteStream(destPath);
      const fileStream = drive.files.get(
        { fileId: file.id ?? undefined, alt: "media" },
        { responseType: "stream" }
      );

      fileStream.then((stream) => {
        if (!stream || !stream.data) {
          console.error(
            `Error downloading file ${file.name}: File stream is undefined`
          );
          reject(`Failed to download file ${file.name}`);
          return;
        }

        stream.data
          .on("error", (err) => {
            console.error(`Error downloading file ${file.name}:`, err);
            reject(`Failed to download file ${file.name}`);
          })
          .pipe(destStream)
          .on("finish", () => {
            console.log(`File ${file.name} downloaded successfully`);
            resolve();
          });
      });
    });

    // Add the download promise to the array
    downloadPromises.push(downloadPromise);
  }

  await Promise.all(downloadPromises);
  console.log("ALL PDF FILES downloaded successfully");
};

export const generateBotVectorData = async () => {
  console.log("Clearing the vector and Redis DB.");
  // clear the vector store
  await store.delete({ deleteAll: true });
  // clear the redis db
  await redis.flushall();

  console.log("GENERATING THE FILENAMES FROM FROM KNOWLEDGEBASE");
  const fileNames = getFilenames(dirPath, extension);

  console.log("MAPPING OVER THE FILES AND STORING INTO VECTOR DATABASE");
  for await (const fileName of fileNames) {
    console.log({ file: fileName });
    const loader = new PDFLoader(`${dirPath}/${fileName}`);
    const docs = await loader.load();
    console.log(docs[0].pageContent.slice(0, 100));
    // Create Splitter
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 5000,
      chunkOverlap: 500,
    });
    const doc_chunks = await splitter.splitDocuments(docs);

    console.log("SAVING THE DOCUMENTS IN VECTOR DATABASE");
    // store the chunks in upstash vector db
    await store.addDocuments(doc_chunks);
  }
  console.log("ALL DOCUMENTS ARE SAVED IN VECTOR DATABASE");
};

export const generateEmbeddings = async () => {
  // cleark the folder
  removeAndCreateFolder();
  // fetch the data from drive
  await fetchDataFromDriveAndSaveLocally();
  // generate the embeddings
  await generateBotVectorData();
};
