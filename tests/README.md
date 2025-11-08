# Tests

This directory contains unit tests for the ephemeral file sharing application.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs when files change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Files

### `encryption.test.ts`

Tests the encryption/decryption functionality used in the storage layer:

- **Round-trip testing**: Ensures data encrypted and then decrypted matches the original
- **Various data types**: Tests text, unicode, JSON, binary data, and large files
- **Unique IVs**: Verifies each encryption uses a unique initialization vector
- **Wrong IV handling**: Ensures wrong IVs produce different output
- **Performance**: Tests encryption/decryption speed on large files (1MB)

#### Test Cases Covered:

1. ✅ Simple text strings
2. ✅ Empty strings
3. ✅ Unicode characters and emojis
4. ✅ Large text (5700+ bytes)
5. ✅ JSON data structures
6. ✅ Binary-like data (all 256 byte values)
7. ✅ IV uniqueness verification
8. ✅ Wrong IV behavior verification
9. ✅ Large file performance (1MB files)

All tests verify that the AES-256-CTR encryption implementation works correctly and securely.

## Test Framework

- **Jest**: JavaScript testing framework
- **TypeScript**: Tests written in TypeScript
- **ts-jest**: TypeScript preprocessor for Jest

## Coverage

Run `npm run test:coverage` to generate a coverage report that shows which parts of the codebase are tested.