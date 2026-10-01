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

module.exports = {
  generateFileHash
};
