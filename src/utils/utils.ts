import fs from "fs";
import path from "path";
const rootDirectory = process.cwd();
const folderName = "knowledgebase";
const folderPath = path.join(rootDirectory, folderName);
export function getFilenames(dirPath: string, extension?: string): string[] {
  return fs
    .readdirSync(dirPath)
    .filter(
      (item) =>
        fs.statSync(path.join(dirPath, item)).isFile() &&
        (extension === undefined || path.extname(item) === extension)
    )
    .sort();
}

export function removeAndCreateFolder() {
  // Check if the folder exists
  if (fs.existsSync(folderPath)) {
    // If it exists, remove it
    fs.rmdirSync(folderPath, { recursive: true });
    console.log(`Folder '${folderPath}' removed successfully.`);
  }

  // Create the folder
  fs.mkdirSync(folderPath);
  console.log(`Folder '${folderPath}' created successfully.`);
}
