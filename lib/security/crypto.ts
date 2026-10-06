/**
 * CyberPingo Cryptographic & Platform Integrity Utilities
 * Ensures runtime integrity, anti-cloning signatures, and constant-time comparisons.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const PLATFORM_SECRET = process.env.PLATFORM_INTEGRITY_SECRET || "cyberpingo-platform-seal-2026-v2-production";

/**
 * Generate a cryptographically signed platform integrity token.
 * Prevents cloning and unauthorized mirroring of CyberPingo APIs and runtime.
 */
export function generateIntegritySeal(pathname: string, timestamp = Date.now()): string {
  const payload = `${pathname}:${timestamp}`;
  const hmac = createHmac("sha256", PLATFORM_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex").slice(0, 32);
  return `cp-v2.${timestamp}.${signature}`;
}

/**
 * Verify a platform integrity token
 */
export function verifyIntegritySeal(seal: string | null | undefined, pathname: string, maxAgeMs = 300000): boolean {
  if (!seal || !seal.startsWith("cp-v2.")) return false;
  const parts = seal.split(".");
  if (parts.length !== 3) return false;

  const [, timestampStr, expectedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > maxAgeMs) return false;

  const hmac = createHmac("sha256", PLATFORM_SECRET);
  hmac.update(`${pathname}:${timestamp}`);
  const actualSignature = hmac.digest("hex").slice(0, 32);

  return safeCompare(expectedSignature, actualSignature);
}

/**
 * Constant-time comparison to prevent side-channel timing attacks
 * on secrets, auth tokens, and flags.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Prevent short-circuit timing leak
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Generates a high-entropy random cryptographic token
 */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("hex");
}
