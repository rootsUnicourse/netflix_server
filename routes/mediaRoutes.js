const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Get media with filters (from our database)
router.get('/', mediaController.getMedia);

// Get media by MongoDB ID
router.get('/id/:id', mediaController.getMediaById);

// Get media by TMDB ID and type
router.get('/tmdb/:type/:tmdbId', mediaController.getMediaByTMDBId);

// Check if media exists by TMDB ID
router.get('/exists/:tmdbId', mediaController.checkMediaExists);

// Direct search to TMDB for the admin interface
router.get('/tmdb-search', mediaController.searchTmdbForAdmin);

// Get TMDB details without storing (for admin interface)
router.get('/tmdb-details/:type/:tmdbId', mediaController.getTmdbDetailsWithoutStoring);

// Get top rated media by users
router.get('/top-rated-by-users', mediaController.getTopRatedByUsers);

// Get top shows in Israel
router.get('/top-shows-israel', mediaController.getTopShowsInIsrael);

// Get animation media
router.get('/animation', mediaController.getAnimationMedia);

// Get media by specific TMDB IDs
router.post('/by-tmdb-ids', mediaController.getMediaByTmdbIds);

// Create new media (admin only)
router.post('/', protect, isAdmin, mediaController.createMedia);

module.exports = router; 