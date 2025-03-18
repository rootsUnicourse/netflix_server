const Review = require('../models/Review');
const Media = require('../models/Media');
const mongoose = require('mongoose');
const User = require('../models/User');

// Helper function to update media ratings
const updateMediaRatings = async (mediaId) => {
  try {
    // Get average rating from reviews
    const ratingData = await Review.getAverageRating(mediaId);
    
    // Update the media with the new rating data
    await Media.findByIdAndUpdate(mediaId, {
      userRating: {
        average: ratingData.averageRating,
        count: ratingData.totalReviews
      }
    });
    
    return ratingData;
  } catch (error) {
    console.error('Error updating media ratings:', error.message);
    throw error;
  }
};

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { mediaId, profileId, rating, content, isPublic, spoiler } = req.body;
    
    if (!mediaId || !content) {
      return res.status(400).json({ message: 'Media ID and content are required' });
    }
    
    // Check if media exists
    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Convert userId to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Check if user already has a review for this media
    const existingReview = await Review.findOne({ 
      user: userId, 
      media: mediaId 
    });
    
    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already reviewed this media. Please update your existing review instead.' 
      });
    }
    
    // Create new review
    const review = new Review({
      user: userId,
      profile: profileId,
      media: mediaId,
      rating: rating || 0,
      content,
      isPublic: isPublic !== undefined ? isPublic : true,
      spoiler: spoiler || false
    });
    
    await review.save();
    
    // Update media ratings
    const averageRating = await updateMediaRatings(mediaId);
    
    res.status(201).json({ 
      review,
      averageRating: averageRating.averageRating,
      totalReviews: averageRating.totalReviews
    });
  } catch (error) {
    console.error('Error in createReview:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reviews for a media item
exports.getMediaReviews = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    
    // Check if media exists
    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Convert userId to ObjectId if user is logged in
    const userId = req.user ? new mongoose.Types.ObjectId(req.user.userId) : null;
    
    // Build query
    const query = { 
      media: mediaId,
      // If user is not logged in or viewing someone else's reviews, only show public reviews
      ...((!userId || req.query.userId !== userId.toString()) && { isPublic: true })
    };
    
    // If viewing a specific user's reviews
    if (req.query.userId) {
      query.user = new mongoose.Types.ObjectId(req.query.userId);
    }
    
    // Build sort object
    let sortObj = {};
    if (sort === 'recent') {
      sortObj = { createdAt: -1 };
    } else if (sort === 'rating-high') {
      sortObj = { rating: -1, createdAt: -1 };
    } else if (sort === 'rating-low') {
      sortObj = { rating: 1, createdAt: -1 };
    } else if (sort === 'likes') {
      sortObj = { likes: -1, createdAt: -1 };
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query with population
    let reviews = await Review.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'emailOrPhone profiles')
      .populate('media', 'title posterPath type');
    
    // Process reviews to include profile data from the user document
    const processedReviews = await Promise.all(reviews.map(async (review) => {
      const reviewObj = review.toObject();
      
      try {
        // Get user object from populated data or find the user
        const user = review.user;
        
        if (user && user.profiles && user.profiles.length > 0) {
          // Find the matching profile by ID from the user's profiles array
          const profileId = review.profile.toString();
          const profileData = user.profiles.find(p => p._id.toString() === profileId);
          
          if (profileData) {
            reviewObj.profile = {
              _id: profileData._id,
              name: profileData.name,
              avatar: profileData.avatar
            };
          } else {
            // If profile not found in user's profiles, use default
            reviewObj.profile = {
              name: 'Unknown User',
              avatar: '/default-avatar.png'
            };
          }
        } else {
          // If user has no profiles, use default
          reviewObj.profile = {
            name: 'Unknown User',
            avatar: '/default-avatar.png'
          };
        }
      } catch (err) {
        console.error('Error processing review profile:', err.message);
        // If error occurs, use default
        reviewObj.profile = {
          name: 'Unknown User',
          avatar: '/default-avatar.png'
        };
      }
      
      return reviewObj;
    }));
    
    // Get total count for pagination
    const total = await Review.countDocuments(query);
    
    res.status(200).json({
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalReviews: total,
      averageRating: media.userRating.average,
      reviews: processedReviews
    });
  } catch (error) {
    console.error('Error in getMediaReviews:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reviews by a user
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.params.userId ? new mongoose.Types.ObjectId(req.params.userId) : new mongoose.Types.ObjectId(req.user.userId);
    const { page = 1, limit = 10, mediaType } = req.query;
    
    // Build query
    const query = { 
      user: userId,
      // If user is not logged in or viewing someone else's reviews, only show public reviews
      ...((!req.user || userId.toString() !== new mongoose.Types.ObjectId(req.user.userId).toString()) && { isPublic: true })
    };
    
    // Filter by media type if specified
    if (mediaType) {
      // We need to first find media IDs of the specified type
      const mediaIds = await Media.find({ type: mediaType }).distinct('_id');
      query.media = { $in: mediaIds };
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query with population
    let reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('media', 'title posterPath type')
      .populate('user', 'emailOrPhone profiles');
    
    // Process reviews to include profile data from the user document
    const processedReviews = await Promise.all(reviews.map(async (review) => {
      const reviewObj = review.toObject();
      
      try {
        // Get user object from populated data or find the user
        const user = review.user;
        
        if (user && user.profiles && user.profiles.length > 0) {
          // Find the matching profile by ID from the user's profiles array
          const profileId = review.profile.toString();
          const profileData = user.profiles.find(p => p._id.toString() === profileId);
          
          if (profileData) {
            reviewObj.profile = {
              _id: profileData._id,
              name: profileData.name,
              avatar: profileData.avatar
            };
          } else {
            // If profile not found in user's profiles, use default
            reviewObj.profile = {
              name: 'Unknown User',
              avatar: '/default-avatar.png'
            };
          }
        } else {
          // If user has no profiles, use default
          reviewObj.profile = {
            name: 'Unknown User',
            avatar: '/default-avatar.png'
          };
        }
      } catch (err) {
        console.error('Error processing review profile:', err.message);
        // If error occurs, use default
        reviewObj.profile = {
          name: 'Unknown User',
          avatar: '/default-avatar.png'
        };
      }
      
      return reviewObj;
    }));
    
    // Get total count for pagination
    const total = await Review.countDocuments(query);
    
    res.status(200).json({
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalReviews: total,
      reviews: processedReviews
    });
  } catch (error) {
    console.error('Error in getUserReviews:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a specific review by ID
exports.getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    const review = await Review.findById(reviewId)
      .populate('user', 'emailOrPhone profiles')
      .populate('media', 'title posterPath type');
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Convert userId to ObjectId for comparison
    const userId = req.user ? new mongoose.Types.ObjectId(req.user.userId) : null;
    
    // Check if review is private and not owned by the requesting user
    if (!review.isPublic && (!userId || review.user._id.toString() !== userId.toString())) {
      return res.status(403).json({ message: 'This review is private' });
    }
    
    // Process review to include profile data from the user document
    const reviewObj = review.toObject();
    
    try {
      // Get user object from populated data or find the user
      const user = review.user;
      
      if (user && user.profiles && user.profiles.length > 0) {
        // Find the matching profile by ID from the user's profiles array
        const profileId = review.profile.toString();
        const profileData = user.profiles.find(p => p._id.toString() === profileId);
        
        if (profileData) {
          reviewObj.profile = {
            _id: profileData._id,
            name: profileData.name,
            avatar: profileData.avatar
          };
        } else {
          // If profile not found in user's profiles, use default
          reviewObj.profile = {
            name: 'Unknown User',
            avatar: '/default-avatar.png'
          };
        }
      } else {
        // If user has no profiles, use default
        reviewObj.profile = {
          name: 'Unknown User',
          avatar: '/default-avatar.png'
        };
      }
    } catch (err) {
      console.error('Error processing review profile:', err.message);
      // If error occurs, use default
      reviewObj.profile = {
        name: 'Unknown User',
        avatar: '/default-avatar.png'
      };
    }
    
    res.status(200).json(reviewObj);
  } catch (error) {
    console.error('Error in getReviewById:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, content, isPublic, spoiler } = req.body;
    
    // Find the review
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Convert userId to ObjectId for comparison
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Check if user owns the review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only update your own reviews' });
    }
    
    // Update fields
    if (rating !== undefined) review.rating = rating;
    if (content) review.content = content;
    if (isPublic !== undefined) review.isPublic = isPublic;
    if (spoiler !== undefined) review.spoiler = spoiler;
    
    // Save updated review
    await review.save();
    
    // Update media ratings
    const averageRating = await updateMediaRatings(review.media);
    
    res.status(200).json({ 
      review,
      averageRating: averageRating.averageRating,
      totalReviews: averageRating.totalReviews
    });
  } catch (error) {
    console.error('Error in updateReview:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    // Find the review
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Convert userId to ObjectId for comparison
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Check if user owns the review or is an admin
    if (review.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }
    
    const mediaId = review.media;
    
    // Delete the review
    await Review.findByIdAndDelete(reviewId);
    
    // Update media ratings
    const averageRating = await updateMediaRatings(mediaId);
    
    res.status(200).json({ 
      message: 'Review deleted successfully',
      averageRating: averageRating.averageRating,
      totalReviews: averageRating.totalReviews
    });
  } catch (error) {
    console.error('Error in deleteReview:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Like a review
exports.likeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    // Find and update the review
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { likes: 1 } },
      { new: true }
    );
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.status(200).json({ likes: review.likes });
  } catch (error) {
    console.error('Error in likeReview:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get top rated media based on reviews
exports.getTopRatedMedia = async (req, res) => {
  try {
    const { limit = 10, mediaType } = req.query;
    
    const topRated = await Review.getTopRatedMedia(Number(limit), mediaType);
    
    res.status(200).json(topRated);
  } catch (error) {
    console.error('Error in getTopRatedMedia:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 