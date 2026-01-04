/**
 * File Hash Service
 * 
 * Provides utilities for computing file hashes (SHA-256) for deduplication.
 */

/**
 * Compute SHA-256 hash of a file
 * Returns hex string (64 characters)
 */
export async function computeFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Compute SHA-256 hash of an ArrayBuffer
 * Returns hex string (64 characters)
 */
export async function computeArrayBufferHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Validate that a string is a valid SHA-256 hash (64 hex characters)
 */
export function isValidFileHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

