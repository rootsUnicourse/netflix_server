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

// Search media in TMDB
router.get('/search', mediaController.searchMedia);

// Get trending media from TMDB
router.get('/trending', mediaController.getTrending);

// Get popular media from TMDB
router.get('/popular', mediaController.getPopular);

// Get top rated media from TMDB
router.get('/top-rated', mediaController.getTopRated);

// Get top rated media by users
router.get('/top-rated-by-users', mediaController.getTopRatedByUsers);

// Get media by genre from TMDB
router.get('/genre', mediaController.getByGenre);

// Sync trending media from TMDB to our database
router.post('/sync-trending', mediaController.syncTrendingMedia);

// Seed database with initial content from TMDB
router.post('/seed-database', protect, isAdmin, mediaController.seedDatabase);

// Sync popular movies from TMDB to our database
router.post('/sync-popular-movies', protect, isAdmin, mediaController.syncPopularMovies);

// Sync popular TV shows from TMDB to our database
router.post('/sync-popular-tv', protect, isAdmin, mediaController.syncPopularTVShows);

// Refresh all media data from TMDB
router.post('/refresh-all', protect, isAdmin, mediaController.refreshAllMedia);

// Update media featured status
router.patch('/featured/:id', protect, isAdmin, mediaController.updateFeaturedStatus);

// Update user ratings for a media item
router.patch('/ratings/:mediaId', protect, isAdmin, mediaController.updateUserRatings);

// Get top shows in Israel
router.get('/top-shows-israel', mediaController.getTopShowsInIsrael);

// Get animation media
router.get('/animation', mediaController.getAnimationMedia);

// Get media by specific TMDB IDs
router.post('/by-tmdb-ids', mediaController.getMediaByTmdbIds);

// Mark shows as popular in Israel (admin only)
router.post('/mark-popular-israel', protect, isAdmin, mediaController.markShowsAsPopularInIsrael);

// Create new media (admin only)
router.post('/', protect, isAdmin, mediaController.createMedia);

// Get AI-powered personalized media recommendations
router.get('/ai-recommendations', mediaController.getAIRecommendations);

module.exports = router; 