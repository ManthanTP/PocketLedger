/**
 * Cryptographic Utility for Pocket-Ledger.pro
 *
 * Implements industry-standard Web Crypto primitives:
 * - PBKDF2-HMAC-SHA256 with 100,000 iterations for PIN and password derivation (OWASP & NIST recommended)
 * - Cryptographically secure pseudo-random salts (128-bit / 16-byte) via crypto.getRandomValues
 * - Constant-time comparison to prevent timing side-channel attacks
 * - Legacy hash compatibility function for seamless user migration
 * - AES-GCM encryption/decryption primitives for sensitive payload protection
 */

const PBKDF2_ITERATIONS = 100000;
const HASH_LENGTH_BITS = 256; // 32 bytes

// Helper: convert Uint8Array to lowercase hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Constant-time string equality check to prevent timing attacks
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a cryptographically secure random salt of the specified byte length
 */
export function generateSalt(length = 16): string {
  const saltBytes = new Uint8Array(length);
  crypto.getRandomValues(saltBytes);
  return bytesToHex(saltBytes);
}

/**
 * Derives a PBKDF2-HMAC-SHA256 hash from a secret (PIN or password) and a salt
 */
export async function deriveKeyHash(secret: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const secretBuffer = enc.encode(secret) as unknown as BufferSource;
  const saltBuffer = hexToBytes(saltHex) as unknown as BufferSource;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH_BITS
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

/**
 * Derive a new PIN verifier and salt
 */
export async function derivePinVerifier(pin: string, customSaltHex?: string): Promise<{ hashHex: string; saltHex: string }> {
  const saltHex = customSaltHex || generateSalt(16);
  const hashHex = await deriveKeyHash(pin, saltHex);
  return { hashHex, saltHex };
}

/**
 * Verify a PIN against a stored salt and hash using constant-time comparison
 */
export async function verifyPin(pin: string, storedHashHex: string, saltHex: string): Promise<boolean> {
  try {
    const computedHash = await deriveKeyHash(pin, saltHex);
    return timingSafeEqual(computedHash, storedHashHex);
  } catch (err) {
    console.error('Error during PIN verification:', err);
    return false;
  }
}

/**
 * Normalizes a recovery answer (lowercase, trimmed) and derives a secure verifier
 */
export async function deriveRecoveryVerifier(
  answer: string,
  customSaltHex?: string
): Promise<{ hashHex: string; saltHex: string }> {
  const normalized = answer.trim().toLowerCase();
  const saltHex = customSaltHex || generateSalt(16);
  const hashHex = await deriveKeyHash(normalized, saltHex);
  return { hashHex, saltHex };
}

/**
 * Verify a recovery answer against stored salt and hash
 */
export async function verifyRecovery(
  answer: string,
  storedHashHex: string,
  saltHex: string
): Promise<boolean> {
  try {
    const normalized = answer.trim().toLowerCase();
    const computedHash = await deriveKeyHash(normalized, saltHex);
    return timingSafeEqual(computedHash, storedHashHex);
  } catch (err) {
    console.error('Error during recovery verification:', err);
    return false;
  }
}

/**
 * Legacy 32-bit polynomial rolling hash.
 * KEPT STRICTLY for backward-compatibility to authenticate existing users
 * and migrate their credentials to PBKDF2. Never use for new PINs.
 */
export function legacyHashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Optional Web Crypto AES-256-GCM envelope encryption primitive.
 * Can be used to encrypt sensitive payload strings at rest when required.
 */
export async function encryptAESGCM(dataText: string, keyHex: string): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const rawKey = hexToBytes(keyHex) as unknown as BufferSource;
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const cryptoKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    cryptoKey,
    enc.encode(dataText) as unknown as BufferSource
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
    iv: bytesToHex(iv),
  };
}

export async function decryptAESGCM(ciphertextHex: string, ivHex: string, keyHex: string): Promise<string> {
  const dec = new TextDecoder();
  const rawKey = hexToBytes(keyHex) as unknown as BufferSource;
  const iv = hexToBytes(ivHex) as unknown as BufferSource;
  const ciphertextBytes = hexToBytes(ciphertextHex) as unknown as BufferSource;

  const cryptoKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertextBytes
  );

  return dec.decode(decrypted);
}
