/**
 * cryptoService.js
 * 
 * Client-side Encoding / Decoding / Encryption / Decryption utilities
 * Methods: Base64, AES (via crypto-js), SHA-256 (via Web Crypto API), QR Code (via qrcode)
 */

import CryptoJS from 'crypto-js';
import QRCode from 'qrcode';

// ─────────────────────────────────────────────
// BASE64
// ─────────────────────────────────────────────

/**
 * Encode a plain string to Base64
 */
export const base64Encode = (text) => {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    throw new Error('Base64 encoding failed. Ensure the input is valid UTF-8 text.');
  }
};

/**
 * Decode a Base64 string back to plain text
 */
export const base64Decode = (encoded) => {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    throw new Error('Base64 decoding failed. Ensure the input is a valid Base64 string.');
  }
};

/**
 * Encode a File object to a Base64 data URL
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file as Base64.'));
    reader.readAsDataURL(file);
  });
};

// ─────────────────────────────────────────────
// AES ENCRYPTION / DECRYPTION
// ─────────────────────────────────────────────

/**
 * AES-256 encrypt plaintext using a secret passphrase
 */
export const aesEncrypt = (plaintext, passphrase) => {
  if (!plaintext || !passphrase) throw new Error('Both plaintext and passphrase are required for encryption.');
  const encrypted = CryptoJS.AES.encrypt(plaintext, passphrase).toString();
  return encrypted;
};

/**
 * AES-256 decrypt ciphertext using the same secret passphrase
 */
export const aesDecrypt = (ciphertext, passphrase) => {
  if (!ciphertext || !passphrase) throw new Error('Both ciphertext and passphrase are required for decryption.');
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error('Decryption produced empty output. Passphrase may be incorrect.');
    return decrypted;
  } catch {
    throw new Error('AES decryption failed. Verify the passphrase and ciphertext are correct.');
  }
};

// ─────────────────────────────────────────────
// SHA-256 HASH (via Web Crypto API)
// ─────────────────────────────────────────────

/**
 * Generate a SHA-256 hash for any text string (async)
 */
export const sha256Hash = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a SHA-256 hash for a File object (async)
 */
export const sha256HashFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target.result;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      resolve(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));
    };
    reader.onerror = () => reject(new Error('Failed to read file for hashing.'));
    reader.readAsArrayBuffer(file);
  });
};

// ─────────────────────────────────────────────
// QR CODE
// ─────────────────────────────────────────────

/**
 * Generate a QR Code as a data URL PNG
 */
export const generateQRCode = async (text, options = {}) => {
  if (!text) throw new Error('Text is required to generate a QR code.');
  const defaultOptions = {
    width: 256,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
    ...options
  };
  return await QRCode.toDataURL(text, defaultOptions);
};

// ─────────────────────────────────────────────
// HMAC-SHA256 SIGNATURE
// ─────────────────────────────────────────────

/**
 * Generate an HMAC-SHA256 signature for a message using a secret key
 */
export const hmacSha256 = (message, secretKey) => {
  if (!message || !secretKey) throw new Error('Both message and secret key are required for HMAC generation.');
  const hmac = CryptoJS.HmacSHA256(message, secretKey);
  return hmac.toString(CryptoJS.enc.Hex);
};

// ─────────────────────────────────────────────
// URL ENCODING
// ─────────────────────────────────────────────

export const urlEncode = (text) => {
  try { return encodeURIComponent(text); }
  catch { throw new Error('URL encoding failed.'); }
};

export const urlDecode = (encoded) => {
  try { return decodeURIComponent(encoded); }
  catch { throw new Error('URL decoding failed. Input may not be a valid URL-encoded string.'); }
};
