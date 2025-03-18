const express = require('express');
const router = express.Router();
const {
    addProfile,
    getProfiles,
    deleteProfile,
    updateProfileName,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes (Require authentication)
router.post('/add', protect, addProfile);
router.get('/', protect, getProfiles);
router.delete('/:profileId', protect, deleteProfile);
router.put('/:profileId', protect, updateProfileName);

// Watchlist routes
router.get('/watchlist', protect, getWatchlist);
router.post('/watchlist', protect, addToWatchlist);
router.delete('/watchlist/:mediaId', protect, removeFromWatchlist);

module.exports = router;
