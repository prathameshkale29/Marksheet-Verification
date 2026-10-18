const crypto = require('crypto');

const SECRET_KEY = process.env.ENCRYPTION_SECRET || 'MARKSHEET_VERIFICATION_MASTER_SECRET_2026';

/**
 * Generate SHA-256 hash
 */
const generateSHA256 = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generate SHA-512 hash for enhanced integrity
 */
const generateSHA512 = (buffer) => {
  return crypto.createHash('sha512').update(buffer).digest('hex');
};

/**
 * Encrypt arbitrary text using AES-256-CBC
 */
const encryptAES = (plainText) => {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(SECRET_KEY, 'salt_marksheet', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt AES-256-CBC payload
 */
const decryptAES = (encryptedPayload) => {
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(SECRET_KEY, 'salt_marksheet', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
};

/**
 * Generate HMAC-SHA256 digital signature
 */
const generateHMACSignature = (payloadString) => {
  return crypto.createHmac('sha256', SECRET_KEY).update(payloadString).digest('hex');
};

/**
 * Create a Tamper-Proof Encoded Marksheet Token
 * Combines Verification ID, File Hash, First Upload Timestamp, and HMAC Signature
 */
const createEncodedMarksheetToken = (verificationId, fileHash, uploadedAt, uploaderInfo = {}) => {
  const payload = {
    vId: verificationId,
    hash: fileHash,
    ts: new Date(uploadedAt).toISOString(),
    upBy: uploaderInfo.name || 'Authorized Uploader',
    org: uploaderInfo.organization || 'Educational Authority'
  };

  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString('base64url');
  const signature = generateHMACSignature(payloadBase64);

  return `MKS-ENCODED.${payloadBase64}.${signature}`;
};

/**
 * Decodes and verifies a Tamper-Proof Encoded Marksheet Token
 */
const decodeAndVerifyToken = (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Empty or invalid token format' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'MKS-ENCODED') {
    return { valid: false, error: 'Invalid token structure. Expected MKS-ENCODED format.' };
  }

  const payloadBase64 = parts[1];
  const providedSignature = parts[2];

  // Verify HMAC signature
  const expectedSignature = generateHMACSignature(payloadBase64);
  if (providedSignature !== expectedSignature) {
    return {
      valid: false,
      tampered: true,
      error: 'CRITICAL: Token cryptographic signature mismatch! Token has been tampered with or modified.'
    };
  }

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const decoded = JSON.parse(payloadJson);
    return {
      valid: true,
      tampered: false,
      data: decoded
    };
  } catch (err) {
    return { valid: false, error: 'Corrupted token payload content.' };
  }
};

module.exports = {
  generateSHA256,
  generateSHA512,
  encryptAES,
  decryptAES,
  generateHMACSignature,
  createEncodedMarksheetToken,
  decodeAndVerifyToken
};
