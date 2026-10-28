const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const ORIGINAL_DIR = path.join(UPLOADS_DIR, 'original');
const PENDING_DIR = path.join(UPLOADS_DIR, 'pending');
const WATERMARKED_DIR = path.join(UPLOADS_DIR, 'watermarked');
const QR_DIR = path.join(UPLOADS_DIR, 'qrcodes');
const ASSETS_DIR = path.join(UPLOADS_DIR, 'assets');

// Ensure upload directories exist
const initStorage = () => {
  [UPLOADS_DIR, ORIGINAL_DIR, PENDING_DIR, WATERMARKED_DIR, QR_DIR, ASSETS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

initStorage();

/**
 * Creates a clean safe file name
 */
const getSafeName = (fileName, ext) => {
  const base = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return base || 'document';
};

/**
 * Saves original file securely (never overwritten)
 */
const saveOriginalFile = async (originalBuffer, fileName, verificationId, mimeType) => {
  initStorage();
  const timestamp = Date.now();
  const ext = path.extname(fileName) || (mimeType === 'application/pdf' ? '.pdf' : '.jpg');
  const safeBase = getSafeName(fileName, ext);
  const diskName = `${verificationId}_${safeBase}_orig_${timestamp}${ext}`;
  const diskPath = path.join(ORIGINAL_DIR, diskName);

  await fs.promises.writeFile(diskPath, originalBuffer);

  return {
    originalFileUrl: `/uploads/original/${diskName}`,
    originalFilePath: diskPath
  };
};

/**
 * Saves preview document labeled PENDING VERIFICATION
 */
const savePendingPreview = async (previewBuffer, fileName, verificationId, mimeType) => {
  initStorage();
  const timestamp = Date.now();
  const ext = path.extname(fileName) || (mimeType === 'application/pdf' ? '.pdf' : '.jpg');
  const safeBase = getSafeName(fileName, ext);
  const diskName = `${verificationId}_${safeBase}_pending_${timestamp}${ext}`;
  const diskPath = path.join(PENDING_DIR, diskName);

  await fs.promises.writeFile(diskPath, previewBuffer);

  return {
    pendingFileUrl: `/uploads/pending/${diskName}`,
    pendingFilePath: diskPath
  };
};

/**
 * Saves final approved watermarked document
 */
const saveWatermarkedFile = async (watermarkedBuffer, fileName, verificationId, mimeType) => {
  initStorage();
  const timestamp = Date.now();
  const ext = path.extname(fileName) || (mimeType === 'application/pdf' ? '.pdf' : '.jpg');
  const safeBase = getSafeName(fileName, ext);
  const diskName = `${verificationId}_${safeBase}_verified_${timestamp}${ext}`;
  const diskPath = path.join(WATERMARKED_DIR, diskName);

  await fs.promises.writeFile(diskPath, watermarkedBuffer);

  return {
    watermarkedFileUrl: `/uploads/watermarked/${diskName}`,
    watermarkedFilePath: diskPath
  };
};

/**
 * Saves server-generated QR Code PNG
 */
const saveQRCodeImage = async (qrBuffer, verificationId) => {
  initStorage();
  const diskName = `qr_${verificationId}.png`;
  const diskPath = path.join(QR_DIR, diskName);

  await fs.promises.writeFile(diskPath, qrBuffer);

  return {
    qrCodeUrl: `/uploads/qrcodes/${diskName}`,
    qrCodePath: diskPath
  };
};

/**
 * Legacy support for saveFile
 */
const saveFile = async (originalBuffer, watermarkedBuffer, fileName, verificationId, mimeType) => {
  const orig = await saveOriginalFile(originalBuffer, fileName, verificationId, mimeType);
  const wmk = await saveWatermarkedFile(watermarkedBuffer, fileName, verificationId, mimeType);
  return {
    ...orig,
    ...wmk
  };
};

module.exports = {
  saveOriginalFile,
  savePendingPreview,
  saveWatermarkedFile,
  saveQRCodeImage,
  saveFile,
  UPLOADS_DIR,
  ORIGINAL_DIR,
  PENDING_DIR,
  WATERMARKED_DIR,
  QR_DIR,
  ASSETS_DIR
};
