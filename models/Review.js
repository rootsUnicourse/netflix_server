const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile',
    required: true
  },
  media: {
    type: Schema.Types.Mixed, // Changed from ObjectId to Mixed to allow string IDs for TMDB content
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    required: true,
    default: 0 // 0 means "no rating", just a text review
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  likes: {
    type: Number,
    default: 0
  },
  spoiler: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Create compound index for user+profile+media to ensure a profile can only review a media item once
ReviewSchema.index({ user: 1, profile: 1, media: 1 }, { unique: true });

// Create indexes for common query patterns
ReviewSchema.index({ media: 1, createdAt: -1 }); // Recent reviews for a media
ReviewSchema.index({ media: 1, rating: -1 }); // Top-rated reviews for a media
ReviewSchema.index({ user: 1, createdAt: -1 }); // User's reviews by date
ReviewSchema.index({ isPublic: 1 }); // Public vs private reviews

// Static method to get average rating for a media item
ReviewSchema.statics.getAverageRating = async function(mediaId) {
  try {
    // Check if mediaId is a string that's not a valid ObjectId (like a TMDB ID)
    let mediaQuery;
    if (typeof mediaId === 'string' && mediaId.startsWith('tmdb-')) {
      // For TMDB-style IDs, use the string directly
      mediaQuery = mediaId;
    } else {
      // For ObjectId-compatible IDs, convert to ObjectId
      try {
        mediaQuery = new mongoose.Types.ObjectId(mediaId);
      } catch (err) {
        // If conversion fails, use the string directly
        mediaQuery = mediaId;
      }
    }
    
    const result = await this.aggregate([
      {
        $match: { 
          media: mediaQuery,
          rating: { $gt: 0 } // Only include actual ratings (not 0)
        }
      },
      {
        $group: {
          _id: '$media',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);
    
    return result.length > 0 
      ? { 
          averageRating: parseFloat(result[0].averageRating.toFixed(1)), 
          totalReviews: result[0].totalReviews 
        } 
      : { 
          averageRating: 0, 
          totalReviews: 0 
        };
  } catch (error) {
    console.error('Error in getAverageRating:', error);
    return { 
      averageRating: 0, 
      totalReviews: 0 
    };
  }
};

// Static method to get top rated media
ReviewSchema.statics.getTopRatedMedia = async function(limit = 10, mediaType = null) {
  const match = mediaType 
    ? { rating: { $gt: 0 }, 'mediaData.type': mediaType } 
    : { rating: { $gt: 0 } };
    
  return this.aggregate([
    {
      $match: { rating: { $gt: 0 } } // Only include actual ratings (not 0)
    },
    {
      $group: {
        _id: '$media',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    },
    {
      $match: {
        totalReviews: { $gte: 1 } // Require at least 1 review to be considered (changed from 5)
      }
    },
    {
      $lookup: {
        from: 'media',
        localField: '_id',
        foreignField: '_id',
        as: 'mediaData'
      }
    },
    {
      $unwind: {
        path: '$mediaData',
        preserveNullAndEmptyArrays: true // Keep TMDB entries that don't have DB entries
      }
    },
    {
      $match: match
    },
    {
      $sort: { averageRating: -1, totalReviews: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: '$mediaData._id',
        tmdbId: '$mediaData.tmdbId',
        title: '$mediaData.title',
        type: '$mediaData.type',
        posterPath: '$mediaData.posterPath',
        backdropPath: '$mediaData.backdropPath',
        averageRating: 1,
        totalReviews: 1
      }
    }
  ]);
};

module.exports = mongoose.model('Review', ReviewSchema); 