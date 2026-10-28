const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const marksheetController = require('../controllers/marksheetController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 1. Upload & submit marksheet for verification (sets PENDING/NEEDS_REVIEW status)
router.post('/upload', authenticateToken, upload.single('file'), marksheetController.uploadAndVerifyMarksheet);

// 2. Admin Approval of Marksheet (generates verified document with College Logo, Watermark, & QR code)
router.post('/:verificationId/approve', authenticateToken, requireAdmin, marksheetController.approveMarksheet);

// 3. Admin Rejection of Marksheet (mandatory rejection reason required)
router.post('/:verificationId/reject', authenticateToken, requireAdmin, marksheetController.rejectMarksheet);

// 4. Admin Correction of OCR extracted details
router.put('/:verificationId/ocr-correct', authenticateToken, requireAdmin, marksheetController.correctMarksheetOCR);

// 5. Public Verification Endpoint (via QR Code or direct lookup - minimal data disclosed)
router.get('/public-verify/:verificationId', marksheetController.getPublicVerification);

// 6. Decode and verify document / token
router.post('/decode-verify', upload.single('file'), marksheetController.decodeAndVerifyDocument);

// 7. Review marksheet across devices (side-by-side review)
router.get('/review/:verificationId', authenticateToken, marksheetController.getMarksheetForReview);

// 8. Get verification stats for dashboards
router.get('/stats', marksheetController.getVerificationStats);

// 9. Get verification attempt history log
router.get('/history', marksheetController.getVerificationHistory);

// 10. Get all marksheets (with search/filter/pagination)
router.get('/', authenticateToken, marksheetController.getAllMarksheets);

// 11. Download watermarked document (ONLY allowed for VERIFIED marksheets)
router.get('/:verificationId/download', authenticateToken, marksheetController.downloadWatermarkedDocument);

// 12. Check marksheet status by SHA-256 hash
router.get('/hash/:hash', marksheetController.getMarksheetByHash);

// 13. Get marksheet by verification ID
router.get('/:verificationId', authenticateToken, marksheetController.getMarksheetByVerificationId);

module.exports = router;
