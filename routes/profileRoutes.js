const express = require('express');
const router = express.Router();
const {
    addProfile,
    getProfiles,
    deleteProfile,
    updateProfileName
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes (Require authentication)
router.post('/add', protect, addProfile);
router.get('/', protect, getProfiles);
router.delete('/:profileId', protect, deleteProfile);
router.put('/:profileId', protect, updateProfileName);

module.exports = router;
