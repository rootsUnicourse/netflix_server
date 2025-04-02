const express = require('express');
const router = express.Router();
const { getPopularMedia, getMediaDetails, getRecommendations, getNewReleases, getTopShowsInIsrael, getMediaImages, getAnimationMedia, getActionMedia, getTopRatedMediaByUsers } = require('../controllers/tmdbController');

// Get popular media (movies and TV shows)
router.get('/popular', getPopularMedia);

// Get detailed information for a specific media item by TMDB ID and type
router.get('/details/:mediaType/:tmdbId', getMediaDetails);

// Get all available images for a specific media item
router.get('/images/:mediaType/:tmdbId', getMediaImages);

// Get AI-style recommendations
router.get('/recommendations', getRecommendations);

// Get new releases (recently released content)
router.get('/new-releases', getNewReleases);

// Get top shows in Israel
router.get('/top-shows-israel', getTopShowsInIsrael);

// Get animation media
router.get('/animation', getAnimationMedia);

// Get action media
router.get('/action', getActionMedia);

// Get top rated media by users (based on reviews)
router.get('/top-rated-by-users', getTopRatedMediaByUsers);

module.exports = router; 