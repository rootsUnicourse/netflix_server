const mongoose = require('mongoose');

const TMDBWatchlistItemSchema = new mongoose.Schema({
  tmdbId: { 
    type: Number, 
    required: true
  },
  title: { 
    type: String, 
    required: true
  },
  type: { 
    type: String, 
    enum: ['movie', 'tv'], 
    required: true 
  },
  overview: { 
    type: String 
  },
  posterPath: { 
    type: String 
  },
  backdropPath: { 
    type: String 
  },
  tmbdFullId: {
    type: String, // Stores the format "tmdb-type-id"
    required: true,
    unique: true
  }
}, { timestamps: true });

// Create indexes for better performance
TMDBWatchlistItemSchema.index({ tmdbId: 1, type: 1 });
TMDBWatchlistItemSchema.index({ tmbdFullId: 1 }, { unique: true });

module.exports = mongoose.model('TMDBWatchlistItem', TMDBWatchlistItemSchema); 