const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const marksheetController = require('../controllers/marksheetController');

// 1. Upload & verify document
router.post('/upload', upload.single('file'), marksheetController.uploadAndVerifyMarksheet);

// 2. Get verification stats for dashboard
router.get('/stats', marksheetController.getVerificationStats);

// 3. Get verification attempt history log
router.get('/history', marksheetController.getVerificationHistory);

// 4. Get all verified marksheets (with search/filter)
router.get('/', marksheetController.getAllMarksheets);

// 5. Get marksheet by verification ID
router.get('/:verificationId', marksheetController.getMarksheetByVerificationId);

// 6. Check marksheet status by SHA-256 hash
router.get('/hash/:hash', marksheetController.getMarksheetByHash);

// 7. Download watermarked document
router.get('/:verificationId/download', marksheetController.downloadWatermarkedDocument);

module.exports = router;
