const express = require('express');
const router = express.Router();
const { getPopularMedia } = require('../controllers/tmdbController');

// Get popular media (movies and TV shows)
router.get('/popular', getPopularMedia);

module.exports = router; 