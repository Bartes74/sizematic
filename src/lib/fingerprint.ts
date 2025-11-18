/**
 * Fingerprint Utilities
 *
 * Provides privacy-safe fingerprinting for phone numbers and email addresses
 * to detect and prevent abuse of the Secret Giver free token system.
 *
 * GDPR Compliance:
 * - All values are hashed using SHA-256
 * - Original phone numbers and emails are never stored
 * - Hashes are salted to prevent rainbow table attacks
 * - Hashes are irreversible (one-way function)
 */

import { createHash } from 'crypto';

/**
 * Get the fingerprint salt from environment
 * IMPORTANT: This must be kept secret and consistent across deployments
 */
function getFingerprintSalt(): string {
  const salt = process.env.FINGERPRINT_SALT;

  if (!salt) {
    throw new Error(
      'FINGERPRINT_SALT environment variable is required for anti-abuse protection. ' +
      'Please set it to a secure random value (32+ characters).'
    );
  }

  if (salt.length < 32) {
    throw new Error(
      'FINGERPRINT_SALT must be at least 32 characters long for security. ' +
      'Generate a secure random string.'
    );
  }

  return salt;
}

/**
 * Normalize phone number by removing all non-digit characters
 *
 * Examples:
 * - "+48 123 456 789" -> "48123456789"
 * - "(123) 456-7890" -> "1234567890"
 * - "123 456 789" -> "123456789"
 *
 * @param phone Raw phone number string
 * @returns Normalized phone number (digits only)
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Normalize email address
 *
 * Rules:
 * - Trim whitespace
 * - Convert to lowercase
 * - Basic format validation
 *
 * @param email Raw email address
 * @returns Normalized email address
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validate phone number format
 *
 * Requirements:
 * - After normalization, must be 7-15 digits (international phone numbers)
 *
 * @param phone Normalized phone number
 * @returns True if valid
 */
function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^\d{7,15}$/.test(normalized);
}

/**
 * Validate email address format
 *
 * Basic RFC 5322 compliant validation
 *
 * @param email Email address
 * @returns True if valid
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Create SHA-256 hash of a value with salt
 *
 * @param value The value to hash
 * @param salt The salt to use
 * @returns Hex-encoded SHA-256 hash
 */
function createSHA256Hash(value: string, salt: string): string {
  return createHash('sha256')
    .update(value + salt)
    .digest('hex');
}

/**
 * Hash a phone number for fingerprinting
 *
 * Process:
 * 1. Validate format
 * 2. Normalize (remove non-digits)
 * 3. Hash with salt using SHA-256
 *
 * @param phone Raw phone number (can include spaces, dashes, parentheses)
 * @returns SHA-256 hash of normalized phone number
 * @throws Error if phone number is invalid
 */
export function hashPhoneNumber(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  if (!isValidPhoneNumber(phone)) {
    throw new Error(
      'Invalid phone number format. Must be 7-15 digits after normalization.'
    );
  }

  const normalized = normalizePhoneNumber(phone);
  const salt = getFingerprintSalt();

  return createSHA256Hash(normalized, salt);
}

/**
 * Hash an email address for fingerprinting
 *
 * Process:
 * 1. Validate format
 * 2. Normalize (trim, lowercase)
 * 3. Hash with salt using SHA-256
 *
 * @param email Raw email address
 * @returns SHA-256 hash of normalized email
 * @throws Error if email is invalid
 */
export function hashEmail(email: string): string {
  if (!email) {
    throw new Error('Email address is required');
  }

  const normalized = normalizeEmail(email);

  if (!isValidEmail(normalized)) {
    throw new Error('Invalid email address format');
  }

  const salt = getFingerprintSalt();

  return createSHA256Hash(normalized, salt);
}

/**
 * Verify that fingerprint salt is properly configured
 *
 * Useful for startup checks and testing
 *
 * @returns True if salt is configured and valid
 */
export function verifyFingerprintConfiguration(): boolean {
  try {
    getFingerprintSalt();
    return true;
  } catch {
    return false;
  }
}
