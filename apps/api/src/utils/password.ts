import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

const deriveKey = (password: string, salt: Buffer, keyLength: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

/**
 * Hashes a plaintext password with scrypt (memory-hard KDF shipped with Node).
 * The returned value embeds the salt: `scrypt$<saltHex>$<hashHex>`.
 *
 * Passwords are never stored or logged in plaintext.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await deriveKey(password, salt, KEY_LENGTH);

  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
};

/** Constant-time verification of a plaintext password against a stored hash. */
export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [algorithm, saltHex, hashHex] = storedHash.split('$');

  if (algorithm !== 'scrypt' || !saltHex || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');
  const derived = await deriveKey(password, Buffer.from(saltHex, 'hex'), expected.length);

  return derived.length === expected.length && timingSafeEqual(derived, expected);
};
