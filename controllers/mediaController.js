const Media = require('../models/Media');
const tmdbService = require('../services/tmdbService');
const Review = require('../models/Review');
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