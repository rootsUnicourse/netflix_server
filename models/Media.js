const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  tmdbId: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true, 
    index: true 
  },
  type: { 
    type: String, 
    enum: ['movie', 'tv'], 
    required: true 
  },
  overview: { 
    type: String, 
    required: true 
  },
  posterPath: { 
    type: String 
  },
  backdropPath: { 
    type: String 
  },
  genres: [{ 
    type: String 
  }],
  releaseDate: { 
    type: Date 
  },
  popularity: { 
    type: Number 
  },
  voteAverage: { 
    type: Number 
  },
  voteCount: { 
    type: Number 
  },
  runtime: { 
    type: Number 
  }, // For movies
  seasons: { 
    type: Number 
  }, // For TV shows
  seasonData: [{
    seasonNumber: { type: Number },
    name: { type: String },
    overview: { type: String },
    posterPath: { type: String },
    airDate: { type: Date },
    episodes: [{
      episodeNumber: { type: Number },
      name: { type: String },
      overview: { type: String },
      stillPath: { type: String },
      airDate: { type: Date },
      runtime: { type: Number }
    }]
  }],
  status: { 
    type: String 
  },
  originalLanguage: { 
    type: String 
  },
  cast: [{
    id: { type: Number },
    name: { type: String },
    character: { type: String },
    profilePath: { type: String }
  }],
  trailerKey: { 
    type: String 
  },
  // New fields for additional details
  director: { 
    type: String 
  }, // For movies
  creators: [{ 
    type: String 
  }], // For TV shows
  contentTags: [{ 
    type: String 
  }],
  maturityRating: { 
    type: String 
  },
  additionalImages: [{ 
    type: String 
  }],
  // Fields for local management
  featured: {
    type: Boolean,
    default: false
  },
  trending: {
    type: Boolean,
    default: false
  },
  newRelease: {
    type: Boolean,
    default: false
  },
  popularInIsrael: {
    type: Boolean,
    default: false
  },
  // User rating fields
  userRating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Create indexes for common query patterns
MediaSchema.index({ type: 1, popularity: -1 });
MediaSchema.index({ type: 1, releaseDate: -1 });
MediaSchema.index({ type: 1, voteAverage: -1 });
MediaSchema.index({ genres: 1 });
MediaSchema.index({ featured: 1 });
MediaSchema.index({ trending: 1 });
MediaSchema.index({ newRelease: 1 });
MediaSchema.index({ 'userRating.average': -1 }); // For sorting by user ratings
MediaSchema.index({ popularInIsrael: 1 });

module.exports = mongoose.model('Media', MediaSchema); 