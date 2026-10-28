const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public or student-accessible settings (college name, logo for display)
router.get('/', settingsController.getCollegeSettings);

// Admin-protected settings updates
router.put('/', authenticateToken, requireAdmin, settingsController.updateCollegeSettings);
router.post('/logo', authenticateToken, requireAdmin, upload.single('logo'), settingsController.uploadCollegeLogo);

// Institutional master student records
router.get('/institutional-records', authenticateToken, settingsController.getInstitutionalRecords);

// Audit logs
router.get('/audit-logs', authenticateToken, requireAdmin, settingsController.getAuditLogs);

module.exports = router;
