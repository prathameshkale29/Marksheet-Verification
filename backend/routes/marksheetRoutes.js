const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const marksheetController = require('../controllers/marksheetController');

// 1. Upload, analyze & encode marksheet (records first-time originality in MongoDB)
router.post('/upload', upload.single('file'), marksheetController.uploadAndVerifyMarksheet);

// 2. Decode and verify document (determines marksheet validity and 100% originality match)
router.post('/decode-verify', upload.single('file'), marksheetController.decodeAndVerifyDocument);

// 3. Review marksheet across any mobile/desktop device
router.get('/review/:verificationId', marksheetController.getMarksheetForReview);

// 4. Get verification stats for dashboard
router.get('/stats', marksheetController.getVerificationStats);

// 5. Get verification attempt history log
router.get('/history', marksheetController.getVerificationHistory);

// 6. Get all verified marksheets (with search/filter)
router.get('/', marksheetController.getAllMarksheets);

// 7. Get marksheet by verification ID
router.get('/:verificationId', marksheetController.getMarksheetByVerificationId);

// 8. Check marksheet status by SHA-256 hash
router.get('/hash/:hash', marksheetController.getMarksheetByHash);

// 9. Download watermarked document
router.get('/:verificationId/download', marksheetController.downloadWatermarkedDocument);

module.exports = router;
