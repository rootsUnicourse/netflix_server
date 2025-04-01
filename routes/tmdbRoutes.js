const express = require('express');
const router = express.Router();
const { getPopularMedia, getMediaDetails, getRecommendations } = require('../controllers/tmdbController');

// Get popular media (movies and TV shows)
router.get('/popular', getPopularMedia);

// Get detailed information for a specific media item by TMDB ID and type
router.get('/details/:mediaType/:tmdbId', getMediaDetails);

// Get AI-style recommendations
router.get('/recommendations', getRecommendations);

module.exports = router; 