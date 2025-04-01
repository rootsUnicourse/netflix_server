const express = require('express');
const router = express.Router();
const { getPopularMedia, getMediaDetails } = require('../controllers/tmdbController');

// Get popular media (movies and TV shows)
router.get('/popular', getPopularMedia);

// Get detailed information for a specific media item by TMDB ID and type
router.get('/details/:mediaType/:tmdbId', getMediaDetails);

module.exports = router; 