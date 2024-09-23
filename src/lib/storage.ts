import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { v4 } from "uuid";

const files = new Map();

export async function write(name: string, data: Buffer) {
  await mkdir(path.join(process.cwd(), "data"), { recursive: true });

  const uuid = v4();
  files.set(uuid, name);

  const filePath = path.join(process.cwd(), "data", uuid);
  await writeFile(filePath, data);

  return uuid;
}

export async function read(uuid: string) {
  const filePath = path.join(process.cwd(), "data", uuid);
  const buffer = await readFile(filePath);
  const fileName = files.get(uuid);

  if (fileName == undefined) {
    throw "File not found";
  }

  return {
    buffer,
    fileName
  };
}

// maxAge in milliseconds, 1000 * 60 * 30 is 30 minutes old
export async function cleanOldFiles(maxAge: number) {
  const dataFolder = path.join(process.cwd(), 'data');

  try {
    // Get the current time
    const now = Date.now();

    // Read the files in the data folder
    const files = await readdir(dataFolder);

    // Loop through each file in the folder
    for (const file of files) {
      const filePath = path.join(dataFolder, file);

      // Get the file stats (including modification time)
      const stats = await stat(filePath);

      // Check if the file is older than maxAge
      const fileAge = now - stats.mtimeMs; // mtimeMs is the last modified time in milliseconds
      if (fileAge > maxAge) {
        // Delete the file if it's older than maxAge
        await unlink(filePath);
        console.log(`Deleted old file: ${filePath}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning old files:', error);
  }
}