const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const ORIGINAL_DIR = path.join(UPLOADS_DIR, 'original');
const WATERMARKED_DIR = path.join(UPLOADS_DIR, 'watermarked');

// Ensure upload directories exist
const initStorage = () => {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(ORIGINAL_DIR)) fs.mkdirSync(ORIGINAL_DIR, { recursive: true });
  if (!fs.existsSync(WATERMARKED_DIR)) fs.mkdirSync(WATERMARKED_DIR, { recursive: true });
};

initStorage();

/**
 * Saves a file buffer to disk and returns public static URLs
 */
const saveFile = async (originalBuffer, watermarkedBuffer, fileName, verificationId, mimeType) => {
  initStorage();

  // Create safe file name prefix
  const timestamp = Date.now();
  const ext = path.extname(fileName) || (mimeType === 'application/pdf' ? '.pdf' : '.jpg');
  const safeBaseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const originalFileNameOnDisk = `${verificationId}_${safeBaseName}_orig_${timestamp}${ext}`;
  const watermarkedFileNameOnDisk = `${verificationId}_${safeBaseName}_watermarked_${timestamp}${ext}`;

  const originalPath = path.join(ORIGINAL_DIR, originalFileNameOnDisk);
  const watermarkedPath = path.join(WATERMARKED_DIR, watermarkedFileNameOnDisk);

  await fs.promises.writeFile(originalPath, originalBuffer);
  await fs.promises.writeFile(watermarkedPath, watermarkedBuffer);

  return {
    originalFileUrl: `/uploads/original/${originalFileNameOnDisk}`,
    watermarkedFileUrl: `/uploads/watermarked/${watermarkedFileNameOnDisk}`,
    originalFilePath: originalPath,
    watermarkedFilePath: watermarkedPath
  };
};

module.exports = {
  saveFile,
  ORIGINAL_DIR,
  WATERMARKED_DIR
};
