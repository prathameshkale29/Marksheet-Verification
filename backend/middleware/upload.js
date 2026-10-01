const multer = require('multer');

// Store uploaded file in memory buffer for immediate hash generation & watermarking
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (allowedTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type! Only PDF, JPG, JPEG, PNG, and WEBP formats are allowed.'
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB file size limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
