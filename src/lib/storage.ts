import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { v4 } from "uuid";
import crypto from "crypto";

// Store file metadata including filename and encryption IV
interface GlobalWithEphemeral {
  __ephemeral_files: Map<string, { fileName: string; iv: string }> | undefined;
  __ephemeral_key: string | undefined;
}

const globalWithEphemeral = globalThis as unknown as GlobalWithEphemeral;

const files = globalWithEphemeral.__ephemeral_files || new Map<string, { fileName: string; iv: string }>();

if (!globalWithEphemeral.__ephemeral_files) {
  globalWithEphemeral.__ephemeral_files = files;
}

// Generate a secret key at runtime - this will be different for each server restart
// But assume stickiness if in HMR
const ENCRYPTION_KEY = globalWithEphemeral.__ephemeral_key || crypto.randomBytes(32).toString('hex'); // 256-bit key as hex string

if (!globalWithEphemeral.__ephemeral_key) {
  globalWithEphemeral.__ephemeral_key = ENCRYPTION_KEY;
  console.log("🔐 Encryption key generated for this session");
} else {
  console.log("🔐 Encryption key restored from global scope");
}

/**
 * Encrypts data using AES-256-CTR
 */
function encrypt(data: Buffer): { encryptedData: string; iv: string } {
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32); // Derive 32-byte key

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cipher = crypto.createCipheriv('aes-256-ctr', key as any, iv as any);
    const encryptedParts: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encryptedParts.push(cipher.update(data as any));
    encryptedParts.push(cipher.final());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encrypted = Buffer.concat(encryptedParts as any);

    return { encryptedData: encrypted.toString('hex'), iv: iv.toString('hex') };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using AES-256-CTR
 */
function decrypt(encryptedData: string, ivHex: string): Buffer {
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32); // Derive same 32-byte key
    const encrypted = Buffer.from(encryptedData, 'hex');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decipher = crypto.createDecipheriv('aes-256-ctr', key as any, iv as any);
    const decryptedParts: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decryptedParts.push(decipher.update(encrypted as any));
    decryptedParts.push(decipher.final());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Buffer.concat(decryptedParts as any);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

export async function write(name: string, data: Buffer) {
  await mkdir(path.join(process.cwd(), "data"), { recursive: true });

  const uuid = v4();

  // Encrypt the file data
  const { encryptedData, iv } = encrypt(data);

  // Store metadata (filename and IV for decryption)
  files.set(uuid, { fileName: name, iv });

  const filePath = path.join(process.cwd(), "data", uuid);
  // Write encrypted data as hex string
  await writeFile(filePath, encryptedData, 'utf8');

  console.log(`📁 Encrypted file stored: ${name} (${data.length} bytes) -> ${uuid}`);
  return uuid;
}

export async function read(uuid: string) {
  const filePath = path.join(process.cwd(), "data", uuid);
  const fileMetadata = files.get(uuid);

  if (!fileMetadata) {
    throw new Error("File not found");
  }

  try {
    // Read encrypted data
    const encryptedData = await readFile(filePath, 'utf8');

    // Decrypt the data
    const buffer = decrypt(encryptedData, fileMetadata.iv);

    console.log(`🔓 Decrypted file: ${fileMetadata.fileName} (${buffer.length} bytes) -> ${uuid}`);

    return {
      buffer,
      fileName: fileMetadata.fileName
    };
  } catch (error) {
    console.error(`Failed to decrypt file ${uuid}:`, error);
    throw new Error("Failed to read encrypted file");
  }
}

// maxAge in milliseconds, 1000 * 60 * 30 is 30 minutes old
export async function cleanOldFiles(maxAge: number) {
  const dataFolder = path.join(process.cwd(), 'data');

  try {
    // Get the current time
    const now = Date.now();

    // Read the files in the data folder
    const diskFiles = await readdir(dataFolder);

    // Loop through each file in the folder
    for (const file of diskFiles) {
      const filePath = path.join(dataFolder, file);

      // Get the file stats (including modification time)
      const stats = await stat(filePath);

      // Check if the file is older than maxAge
      const fileAge = now - stats.mtimeMs; // mtimeMs is the last modified time in milliseconds
      if (fileAge > maxAge) {
        // Delete the file if it's older than maxAge
        await unlink(filePath);
        // Also remove from in-memory metadata
        files.delete(file);
        console.log(`🗑️  Deleted expired encrypted file: ${file} (age: ${Math.round(fileAge / 1000 / 60)} minutes)`);
      }
    }
  } catch (error) {
    console.error('Error cleaning old files:', error);
  }
}