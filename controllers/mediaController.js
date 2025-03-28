const Media = require('../models/Media');
const tmdbService = require('../services/tmdbService');
const Review = require('../models/Review');
const refreshAllMediaData = require('../scripts/refreshMediaData');
const aiRecommendationService = require('../services/aiRecommendationService');
const User = require('../models/User');
const mongoose = require('mongoose');

// Get media by MongoDB ID
exports.getMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id);
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    res.status(200).json(media);
  } catch (error) {
    console.error('Error in getMediaById:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get media by TMDB ID and type
exports.getMediaByTMDBId = async (req, res) => {
  try {
    const { tmdbId, type } = req.params;
    
    if (!tmdbId || !type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ message: 'Invalid parameters. Required: tmdbId and type (movie or tv)' });
    }
    
    // Check if media exists in our database
    let media = await Media.findOne({ tmdbId: Number(tmdbId), type });
    
    // If not found, fetch from TMDB and store
    if (!media) {
      try {
        if (type === 'movie') {
          media = await tmdbService.fetchAndStoreMovie(Number(tmdbId));
        } else {
          media = await tmdbService.fetchAndStoreTV(Number(tmdbId));
        }
      } catch (fetchError) {
        return res.status(404).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found in TMDB` });
      }
    }
    
    res.status(200).json(media);
  } catch (error) {
    console.error('Error in getMediaByTMDBId:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search media
exports.searchMedia = async (req, res) => {
  try {
    const { query, page = 1, external = false } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Get results from TMDB
    const results = await tmdbService.searchMedia(query, Number(page));
    
    // Return only movies and TV shows from the results
    let filteredResults = results.results.filter(
      (item) => item.media_type === 'movie' || item.media_type === 'tv'
    );
    
    // If external search isn't explicitly requested, we're done
    if (external !== 'true') {
      return res.status(200).json({
        page: results.page,
        totalPages: results.total_pages,
        totalResults: results.total_results,
        results: filteredResults,
      });
    }
    
    // For external=true, check which media already exist in our database
    // and mark them accordingly
    const tmdbIds = filteredResults.map(item => item.id);
    
    // Check which IDs already exist in our database
    const existingMedia = await Media.find({ 
      tmdbId: { $in: tmdbIds } 
    }).select('tmdbId');
    
    const existingIds = existingMedia.map(item => item.tmdbId);
    
    // Add flag to results indicating if they already exist in our database
    filteredResults = filteredResults.map(item => ({
      ...item,
      exists_in_database: existingIds.includes(item.id)
    }));
    
    res.status(200).json({
      page: results.page,
      totalPages: results.total_pages,
      totalResults: results.total_results,
      results: filteredResults,
    });
  } catch (error) {
    console.error('Error in searchMedia:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get trending media
exports.getTrending = async (req, res) => {
  try {
    const { mediaType = 'all', timeWindow = 'week' } = req.query;
    
    if (mediaType !== 'all' && mediaType !== 'movie' && mediaType !== 'tv') {
      return res.status(400).json({ message: 'Media type must be all, movie, or tv' });
    }
    
    if (timeWindow !== 'day' && timeWindow !== 'week') {
      return res.status(400).json({ message: 'Time window must be day or week' });
    }
    
    const results = await tmdbService.getTrending(mediaType, timeWindow);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error in getTrending:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get popular media
exports.getPopular = async (req, res) => {
  try {
    const { mediaType, page = 1 } = req.query;
    
    if (mediaType !== 'movie' && mediaType !== 'tv') {
      return res.status(400).json({ message: 'Media type must be movie or tv' });
    }
    
    const results = await tmdbService.getPopular(mediaType, Number(page));
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error in getPopular:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get top rated media
exports.getTopRated = async (req, res) => {
  try {
    const { mediaType, page = 1 } = req.query;
    
    if (mediaType !== 'movie' && mediaType !== 'tv') {
      return res.status(400).json({ message: 'Media type must be movie or tv' });
    }
    
    const results = await tmdbService.getTopRated(mediaType, Number(page));
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error in getTopRated:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get media by genre
exports.getByGenre = async (req, res) => {
  try {
    const { mediaType, genreId, page = 1 } = req.query;
    
    if (mediaType !== 'movie' && mediaType !== 'tv') {
      return res.status(400).json({ message: 'Media type must be movie or tv' });
    }
    
    if (!genreId) {
      return res.status(400).json({ message: 'Genre ID is required' });
    }
    
    const results = await tmdbService.getByGenre(mediaType, Number(genreId), Number(page));
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error in getByGenre:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get media from our database with filters
exports.getMedia = async (req, res) => {
  try {
    const { 
      type, 
      genre, 
      genres,
      sort = 'popularity', 
      order = 'desc', 
      page = 1, 
      limit = 20,
      featured,
      trending,
      newRelease
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (genres) {
      // Handle array of genres (using $in operator)
      const genreArray = Array.isArray(genres) ? genres : [genres];
      filter.genres = { $in: genreArray };
    } else if (genre) {
      // Backward compatibility for single genre
      filter.genres = genre;
    }
    
    if (featured === 'true') {
      filter.featured = true;
    }
    
    if (trending === 'true') {
      filter.trending = true;
    }
    
    if (newRelease === 'true') {
      filter.newRelease = true;
    }
    
    // Build sort object
    const sortObj = {};
    
    if (sort === 'popularity') {
      sortObj.popularity = order === 'desc' ? -1 : 1;
    } else if (sort === 'releaseDate') {
      sortObj.releaseDate = order === 'desc' ? -1 : 1;
    } else if (sort === 'rating') {
      sortObj.voteAverage = order === 'desc' ? -1 : 1;
    } else {
      sortObj.popularity = -1; // Default sort
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query
    const media = await Media.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));
    
    // Get total count for pagination
    const total = await Media.countDocuments(filter);
    
    res.status(200).json({
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalResults: total,
      results: media,
    });
  } catch (error) {
    console.error('Error in getMedia:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sync trending media from TMDB to our database
exports.syncTrendingMedia = async (req, res) => {
  try {
    const result = await tmdbService.syncTrendingMedia();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in syncTrendingMedia:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update media featured status
exports.updateFeaturedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;
    
    if (featured === undefined) {
      return res.status(400).json({ message: 'Featured status is required' });
    }
    
    const media = await Media.findByIdAndUpdate(
      id,
      { featured },
      { new: true }
    );
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    res.status(200).json(media);
  } catch (error) {
    console.error('Error in updateFeaturedStatus:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user ratings for a media item
exports.updateUserRatings = async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    // Get the media
    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Get average rating from reviews
    const ratingData = await Review.getAverageRating(mediaId);
    
    // Update the media with the new rating data
    media.userRating = {
      average: ratingData.averageRating,
      count: ratingData.totalReviews
    };
    
    await media.save();
    
    res.status(200).json({
      message: 'User ratings updated successfully',
      userRating: media.userRating
    });
  } catch (error) {
    console.error('Error in updateUserRatings:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get top rated media by users
exports.getTopRatedByUsers = async (req, res) => {
  try {
    const { limit = 10, mediaType } = req.query;
    
    // Build query
    const query = {
      'userRating.count': { $gte: 1 } // Require at least 1 review (changed from 5)
    };
    
    if (mediaType) {
      query.type = mediaType;
    }
    
    // Execute query
    const topRated = await Media.find(query)
      .sort({ 'userRating.average': -1 })
      .limit(Number(limit))
      .select('title type posterPath backdropPath userRating');
    
    res.status(200).json(topRated);
  } catch (error) {
    console.error('Error in getTopRatedByUsers:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Seed database with initial content from TMDB
exports.seedDatabase = async (req, res) => {
  try {
    const result = await tmdbService.seedDatabase();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in seedDatabase:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sync popular movies from TMDB to our database
exports.syncPopularMovies = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const result = await tmdbService.syncPopularMovies(limit);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in syncPopularMovies:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sync popular TV shows from TMDB to our database
exports.syncPopularTVShows = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const result = await tmdbService.syncPopularTVShows(limit);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in syncPopularTVShows:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Refresh all media data from TMDB
exports.refreshAllMedia = async (req, res) => {
  try {
    // Check if user is admin (if you have authentication)
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to perform this action' });
    }

    // Start the refresh process
    console.log('Starting media refresh process from API request');
    
    // Run the refresh process without waiting for it to complete
    // This prevents timeout issues for large datasets
    refreshAllMediaData()
      .then(result => {
        console.log('Refresh completed with result:', result);
      })
      .catch(error => {
        console.error('Refresh failed:', error);
      });
    
    // Immediately return a response
    res.status(200).json({ 
      message: 'Media refresh process started in the background',
      status: 'processing'
    });
  } catch (error) {
    console.error('Error in refreshAllMedia controller:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get top shows in Israel
exports.getTopShowsInIsrael = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const shows = await Media.find({ 
      type: 'tv',
      popularInIsrael: true 
    })
    .sort({ popularity: -1 })
    .limit(limit);
    
    res.status(200).json({
      results: shows,
      totalResults: shows.length,
      page: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error('Error in getTopShowsInIsrael:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark shows as popular in Israel
exports.markShowsAsPopularInIsrael = async (req, res) => {
  try {
    const { showIds } = req.body;
    
    if (!showIds || !Array.isArray(showIds)) {
      return res.status(400).json({ message: 'Invalid request. Expected array of show IDs' });
    }
    
    // Reset all shows first
    await Media.updateMany(
      { popularInIsrael: true },
      { $set: { popularInIsrael: false } }
    );
    
    // Mark the specified shows as popular in Israel
    const result = await Media.updateMany(
      { tmdbId: { $in: showIds }, type: 'tv' },
      { $set: { popularInIsrael: true } }
    );
    
    res.status(200).json({
      message: 'Shows marked as popular in Israel successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in markShowsAsPopularInIsrael:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get animation media
exports.getAnimationMedia = async (req, res) => {
  try {
    const { limit = 15 } = req.query;
    
    // Build query for animation content - genre ID 16 for animation
    const query = {
      genres: "Animation"
    };
    
    // Execute query
    const animationMedia = await Media.find(query)
      .sort({ popularity: -1 })
      .limit(Number(limit))
      .select('_id title type posterPath backdropPath popularity overview');
    
    res.status(200).json({
      results: animationMedia,
      totalResults: animationMedia.length,
      page: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error('Error in getAnimationMedia:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get media by specific TMDB IDs
exports.getMediaByTmdbIds = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of TMDB IDs' });
    }
    
    // Convert string IDs to numbers for comparison
    const numericIds = ids.map(id => parseInt(id));
    
    const media = await Media.find({ 
      tmdbId: { $in: numericIds } 
    }).limit(50);
    
    // Sort the results to match the order of the provided IDs
    const sortedMedia = media.sort((a, b) => {
      return numericIds.indexOf(parseInt(a.tmdbId)) - numericIds.indexOf(parseInt(b.tmdbId));
    });
    
    // Return the data in the standard format expected by the client
    return res.json({
      results: sortedMedia,
      totalResults: sortedMedia.length,
      page: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error('Error fetching media by TMDB IDs:', error);
    res.status(500).json({ message: 'Server error fetching media by TMDB IDs' });
  }
};

// Create new media entry manually (admin only)
exports.createMedia = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to perform this action' });
    }

    const {
      tmdbId, title, type, overview, posterPath, backdropPath, genres,
      releaseDate, popularity, voteAverage, voteCount, runtime, seasons,
      status, originalLanguage, cast, trailerKey, director, creators,
      contentTags, maturityRating, additionalImages, featured, trending,
      newRelease, popularInIsrael
    } = req.body;

    // Validate required fields
    if (!tmdbId || !title || !type || !overview) {
      return res.status(400).json({ 
        message: 'Required fields missing: tmdbId, title, type, and overview are required' 
      });
    }

    // Validate type
    if (type !== 'movie' && type !== 'tv') {
      return res.status(400).json({ 
        message: 'Invalid type: must be "movie" or "tv"' 
      });
    }

    // Check if media with this tmdbId already exists
    const existingMedia = await Media.findOne({ tmdbId });
    if (existingMedia) {
      return res.status(409).json({ 
        message: 'Media with this TMDB ID already exists',
        mediaId: existingMedia._id
      });
    }

    // Create new media document
    const newMedia = new Media({
      tmdbId,
      title,
      type,
      overview,
      posterPath,
      backdropPath,
      genres,
      releaseDate,
      popularity,
      voteAverage,
      voteCount,
      runtime,
      seasons,
      status,
      originalLanguage,
      cast,
      trailerKey,
      director,
      creators,
      contentTags,
      maturityRating,
      additionalImages,
      featured: featured || false,
      trending: trending || false,
      newRelease: newRelease || false,
      popularInIsrael: popularInIsrael || false
    });

    const savedMedia = await newMedia.save();
    
    // Log the action
    console.log(`Admin created new media: ${title} (TMDB ID: ${tmdbId})`);

    res.status(201).json({
      message: 'Media created successfully',
      media: savedMedia
    });
  } catch (error) {
    console.error('Error in createMedia:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check if media with specific TMDB ID exists
exports.checkMediaExists = async (req, res) => {
  try {
    const { tmdbId } = req.params;
    
    if (!tmdbId) {
      return res.status(400).json({ message: 'TMDB ID is required' });
    }
    
    const media = await Media.findOne({ tmdbId: Number(tmdbId) });
    
    res.status(200).json({
      exists: !!media,
      media: media ? {
        _id: media._id,
        title: media.title,
        type: media.type,
        tmdbId: media.tmdbId
      } : null
    });
  } catch (error) {
    console.error('Error in checkMediaExists:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Direct search to TMDB for the admin interface
exports.searchTmdbForAdmin = async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Get results directly from TMDB
    const results = await tmdbService.searchMedia(query, Number(page));
    
    // Return only movies and TV shows from the results
    let filteredResults = results.results.filter(
      (item) => item.media_type === 'movie' || item.media_type === 'tv'
    );
    
    // Check which media already exist in our database
    if (filteredResults.length > 0) {
      const tmdbIds = filteredResults.map(item => item.id);
      
      // Find all media that already exist in our database
      const existingMedia = await Media.find({ 
        tmdbId: { $in: tmdbIds } 
      }).select('tmdbId');
      
      const existingIds = existingMedia.map(item => item.tmdbId);
      
      // Mark existing media
      filteredResults = filteredResults.map(item => ({
        ...item,
        exists_in_database: existingIds.includes(item.id)
      }));
    }
    
    res.status(200).json({
      page: results.page,
      totalPages: results.total_pages,
      totalResults: results.total_results,
      results: filteredResults
    });
  } catch (error) {
    console.error('Error in searchTmdbForAdmin:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get TMDB details without storing (for admin interface)
exports.getTmdbDetailsWithoutStoring = async (req, res) => {
  try {
    const { tmdbId, type } = req.params;
    
    if (!tmdbId || !type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ message: 'Invalid parameters. Required: tmdbId and type (movie or tv)' });
    }
    
    let tmdbData;
    let transformedData;
    
    if (type === 'movie') {
      // Fetch movie data from TMDB without storing
      tmdbData = await tmdbService.getMovieDetails(Number(tmdbId));
      transformedData = tmdbService.transformMovieData(tmdbData);
    } else {
      // Fetch TV show data from TMDB without storing
      tmdbData = await tmdbService.getTVShowDetails(Number(tmdbId));
      transformedData = tmdbService.transformTVData(tmdbData);
    }
    
    // Check if this media already exists in our database
    const existingMedia = await Media.findOne({ tmdbId: Number(tmdbId) });
    
    // Add flag to inform the client if this media already exists
    transformedData.exists_in_database = !!existingMedia;
    
    res.status(200).json(transformedData);
  } catch (error) {
    console.error('Error in getTmdbDetailsWithoutStoring:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get AI-powered personalized recommendations based on user's watchlist
exports.getAIRecommendations = async (req, res) => {
  try {
    const { mediaType = 'all', limit = 10 } = req.query;
    let userId = null;
    
    // Check if user is authenticated
    if (req.user && req.user._id) {
      userId = req.user._id;
    }

    // Validate mediaType
    if (mediaType !== 'all' && mediaType !== 'movie' && mediaType !== 'tv') {
      return res.status(400).json({ 
        message: 'Invalid mediaType. Must be "all", "movie", or "tv"' 
      });
    }

    // Get user's watchlist
    let watchlist = [];
    
    if (userId) {
      // If user is authenticated, get their watchlist
      const user = await User.findById(userId)
        .populate('watchlist')
        .select('watchlist');
        
      if (user && user.watchlist) {
        watchlist = user.watchlist;
      }
    }

    // Get AI-powered recommendations
    const tmdbRecommendations = await aiRecommendationService.getPersonalizedRecommendations(
      watchlist,
      mediaType,
      parseInt(limit, 10)
    );

    // Transform TMDB recommendations to our format
    const processedRecommendations = await Promise.all(
      tmdbRecommendations.map(async (item) => {
        try {
          // Check if media already exists in our database
          const existingMedia = await Media.findOne({ 
            tmdbId: item.id,
            type: item.media_type
          });

          if (existingMedia) {
            return existingMedia;
          }

          // If not in our database, fetch full details from TMDB and transform it
          let tmdbData;
          let transformedData;
          
          if (item.media_type === 'movie') {
            // Fetch movie data from TMDB
            tmdbData = await tmdbService.getMovieDetails(item.id);
            transformedData = tmdbService.transformMovieData(tmdbData);
          } else if (item.media_type === 'tv') {
            // Fetch TV show data from TMDB
            tmdbData = await tmdbService.getTVShowDetails(item.id);
            transformedData = tmdbService.transformTVData(tmdbData);
          } else {
            return null;
          }
          
          // Add the score from the AI recommendation
          transformedData.score = item.score;
          
          // Create a temporary media object (not saved to database)
          // This ensures it has all the fields expected by the frontend
          const tempMedia = new Media(transformedData);
          
          // Convert to plain object (removes Mongoose-specific properties)
          const mediaObject = tempMedia.toObject();
          
          // Add _id field for frontend compatibility
          mediaObject._id = new mongoose.Types.ObjectId();
          
          return mediaObject;
        } catch (itemError) {
          console.error(`Error processing recommendation item ${item.id}:`, itemError.message);
          
          // Return a minimal version if full details fetching fails
          if (item.media_type === 'movie') {
            return {
              _id: new mongoose.Types.ObjectId(),
              tmdbId: item.id,
              title: item.title || 'Unknown Title',
              type: 'movie',
              overview: item.overview || 'No overview available',
              posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
              backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
              releaseDate: item.release_date ? new Date(item.release_date) : null,
              popularity: item.popularity || 0,
              voteAverage: item.vote_average || 0,
              voteCount: item.vote_count || 0,
              runtime: null,
              status: 'Released',
              originalLanguage: item.original_language || 'en',
              cast: [],
              trailerKey: null,
              director: null,
              contentTags: [],
              maturityRating: 'Not Rated',
              additionalImages: [],
              genres: item.genre_ids?.map(id => aiRecommendationService.constructor.getGenreName(id, 'movie')) || [],
              featured: false,
              trending: false,
              newRelease: false,
              popularInIsrael: false,
              score: item.score || 0,
              userRating: { average: 0, count: 0 }
            };
          } else if (item.media_type === 'tv') {
            return {
              _id: new mongoose.Types.ObjectId(),
              tmdbId: item.id,
              title: item.name || 'Unknown Title',
              type: 'tv',
              overview: item.overview || 'No overview available',
              posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
              backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
              releaseDate: item.first_air_date ? new Date(item.first_air_date) : null,
              popularity: item.popularity || 0,
              voteAverage: item.vote_average || 0,
              voteCount: item.vote_count || 0,
              seasons: null,
              seasonData: [],
              status: 'Released',
              originalLanguage: item.original_language || 'en',
              cast: [],
              trailerKey: null,
              creators: [],
              contentTags: [],
              maturityRating: 'Not Rated',
              additionalImages: [],
              genres: item.genre_ids?.map(id => aiRecommendationService.constructor.getGenreName(id, 'tv')) || [],
              featured: false,
              trending: false,
              newRelease: false,
              popularInIsrael: false,
              score: item.score || 0,
              userRating: { average: 0, count: 0 }
            };
          }
          return null;
        }
      })
    );

    // Filter out null values
    const finalRecommendations = processedRecommendations.filter(item => item !== null);

    res.status(200).json({
      results: finalRecommendations,
      totalResults: finalRecommendations.length
    });
  } catch (error) {
    console.error('Error in getAIRecommendations:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 