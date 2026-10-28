const crypto = require('crypto');

/**
 * Generates a SHA-256 cryptographic hash from a file buffer.
 * @param {Buffer} buffer 
 * @returns {string} SHA-256 hash in hexadecimal format
 */
const generateFileHash = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid buffer provided for hash generation.');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generates a normalized record fingerprint based on extracted student fields.
 * Used as a review signal to detect potential duplicate submissions even if rescanned or modified.
 * @param {Object} details - { rollNumber, studentName, passingYear, semester }
 * @returns {string} Normalized fingerprint hash or empty string
 */
const generateNormalizedFingerprint = (details = {}) => {
  const roll = (details.rollNumber || details.prn || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const year = (details.passingYear || '')
    .toString()
    .toLowerCase()
    .replace(/[^0-9]/g, '');
  const sem = (details.semester || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!roll) return '';

  const rawKey = `NORM:${roll}:${year}:${sem}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

module.exports = {
  generateFileHash,
  generateNormalizedFingerprint
};
