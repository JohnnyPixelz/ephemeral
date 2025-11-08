import crypto from 'crypto';

// Test the same encryption/decryption functions as used in storage.ts

// Generate a secret key at runtime - same pattern as storage.ts
const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

/**
 * Encrypts data using AES-256-CTR (same implementation as storage.ts)
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
 * Decrypts data using AES-256-CTR (same implementation as storage.ts)
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

describe('Encryption/Decryption', () => {
  // Test cases with various data types and sizes
  const testCases = [
    {
      name: 'Simple text',
      data: 'Hello, World! This is a test string.'
    },
    {
      name: 'Empty string',
      data: ''
    },
    {
      name: 'Unicode text',
      data: 'こんにちは 🌍 Café naïve résumé'
    },
    {
      name: 'Large text',
      data: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100)
    },
    {
      name: 'JSON data',
      data: JSON.stringify({
        name: 'test.json',
        content: [1, 2, 3, { nested: true }],
        timestamp: new Date().toISOString()
      })
    },
    {
      name: 'Binary-like data',
      data: Array.from({ length: 256 }, (_, i) => String.fromCharCode(i)).join('')
    }
  ];

  testCases.forEach((testCase) => {
    test(`should encrypt and decrypt ${testCase.name} correctly`, () => {
      const originalBuffer = Buffer.from(testCase.data, 'utf8');
      
      // Encrypt the data
      const { encryptedData, iv } = encrypt(originalBuffer);
      
      // Verify encryption properties
      expect(iv).toBeTruthy();
      expect(iv).toHaveLength(32); // 16 bytes = 32 hex chars
      
      // For non-empty data, encrypted data should be different from original
      if (testCase.data.length > 0) {
        expect(encryptedData).toBeTruthy();
        expect(encryptedData).not.toBe(originalBuffer.toString('hex'));
      } else {
        // Empty string should result in empty encrypted data
        expect(encryptedData).toBe('');
      }
      
      // Decrypt the data
      const decryptedBuffer = decrypt(encryptedData, iv);
      
      // Verify decryption worked correctly
      expect(decryptedBuffer).toBeInstanceOf(Buffer);
      expect(decryptedBuffer.toString('utf8')).toBe(testCase.data);
      expect(decryptedBuffer.toString('hex')).toBe(originalBuffer.toString('hex'));
      
      // Log some info for debugging
      console.log(`✅ ${testCase.name}: ${originalBuffer.length} bytes -> ${encryptedData.length} hex chars`);
    });
  });

  test('should generate unique IVs for each encryption', () => {
    const data = Buffer.from('Same data for multiple encryptions');
    
    const result1 = encrypt(data);
    const result2 = encrypt(data);
    const result3 = encrypt(data);
    
    // IVs should be different
    expect(result1.iv).not.toBe(result2.iv);
    expect(result2.iv).not.toBe(result3.iv);
    expect(result1.iv).not.toBe(result3.iv);
    
    // Encrypted data should be different due to different IVs
    expect(result1.encryptedData).not.toBe(result2.encryptedData);
    expect(result2.encryptedData).not.toBe(result3.encryptedData);
    
    // But all should decrypt to the same original data
    expect(decrypt(result1.encryptedData, result1.iv).toString()).toBe(data.toString());
    expect(decrypt(result2.encryptedData, result2.iv).toString()).toBe(data.toString());
    expect(decrypt(result3.encryptedData, result3.iv).toString()).toBe(data.toString());
  });

  test('should produce different output with wrong IV', () => {
    const data = Buffer.from('Test data for wrong IV');
    const { encryptedData, iv: correctIv } = encrypt(data);
    
    // Generate a different IV
    const wrongIv = crypto.randomBytes(16).toString('hex');
    
    // Decrypt with wrong IV should produce different output
    const resultWithWrongIv = decrypt(encryptedData, wrongIv);
    const resultWithCorrectIv = decrypt(encryptedData, correctIv);
    
    // Results should be different
    expect(resultWithWrongIv.toString()).not.toBe(data.toString());
    expect(resultWithCorrectIv.toString()).toBe(data.toString());
    expect(resultWithWrongIv.toString()).not.toBe(resultWithCorrectIv.toString());
  });

  test('should handle large files efficiently', () => {
    // Create a 1MB buffer
    const largeData = Buffer.alloc(1024 * 1024, 'A');
    
    const startTime = Date.now();
    const { encryptedData, iv } = encrypt(largeData);
    const encryptTime = Date.now() - startTime;
    
    const decryptStart = Date.now();
    const decryptedData = decrypt(encryptedData, iv);
    const decryptTime = Date.now() - decryptStart;
    
    expect(decryptedData.toString('hex')).toBe(largeData.toString('hex'));
    
    console.log(`📊 1MB file: encrypt ${encryptTime}ms, decrypt ${decryptTime}ms`);
    
    // Performance should be reasonable (under 1 second for 1MB)
    expect(encryptTime).toBeLessThan(1000);
    expect(decryptTime).toBeLessThan(1000);
  });
});