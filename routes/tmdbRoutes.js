const express = require('express');
const router = express.Router();
const { getPopularMedia, getMediaDetails, getRecommendations, getNewReleases, getTopShowsInIsrael } = require('../controllers/tmdbController');

// Get popular media (movies and TV shows)
router.get('/popular', getPopularMedia);

// Get detailed information for a specific media item by TMDB ID and type
router.get('/details/:mediaType/:tmdbId', getMediaDetails);

// Get AI-style recommendations
router.get('/recommendations', getRecommendations);

// Get new releases (recently released content)
router.get('/new-releases', getNewReleases);

// Get top shows in Israel
router.get('/top-shows-israel', getTopShowsInIsrael);

module.exports = router; 