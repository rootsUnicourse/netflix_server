const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Get top rated media based on reviews
router.get('/top-rated', reviewController.getTopRatedMedia);

// Get all reviews for a specific media
router.get('/media/:mediaId', reviewController.getMediaReviews);

// Get a specific review by ID
router.get('/:reviewId', reviewController.getReviewById);

// Get all reviews by a user
// Public route for viewing a user's public reviews
router.get('/user/:userId', reviewController.getUserReviews);

// Get current user's reviews (both public and private)
router.get('/my-reviews', protect, reviewController.getUserReviews);

// Create a new review
router.post('/', protect, reviewController.createReview);

// Update a review
router.put('/:reviewId', protect, reviewController.updateReview);

// Delete a review
router.delete('/:reviewId', protect, reviewController.deleteReview);

// Like a review
router.post('/:reviewId/like', protect, reviewController.likeReview);

module.exports = router; 