const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

// Get media with filters (from our database)
router.get('/', mediaController.getMedia);

// Get media by MongoDB ID
router.get('/id/:id', mediaController.getMediaById);

// Get media by TMDB ID and type
router.get('/tmdb/:type/:tmdbId', mediaController.getMediaByTMDBId);

// Search media in TMDB
router.get('/search', mediaController.searchMedia);

// Get trending media from TMDB
router.get('/trending', mediaController.getTrending);

// Get popular media from TMDB
router.get('/popular', mediaController.getPopular);

// Get top rated media from TMDB
router.get('/top-rated', mediaController.getTopRated);

// Get media by genre from TMDB
router.get('/genre', mediaController.getByGenre);

// Sync trending media from TMDB to our database
router.post('/sync-trending', mediaController.syncTrendingMedia);

// Update media featured status
router.patch('/featured/:id', mediaController.updateFeaturedStatus);

module.exports = router; 