const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { getLogs, clearLogs } = require('../controllers/systemLogController');

// All routes are protected and require admin privileges
router.use(protect);
router.use(isAdmin);

// System logs routes
router.get('/logs', getLogs);
router.delete('/logs', clearLogs);

module.exports = router; 