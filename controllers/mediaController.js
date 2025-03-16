const Media = require('../models/Media');
const tmdbService = require('../services/tmdbService');

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
    const { query, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const results = await tmdbService.searchMedia(query, Number(page));
    
    // Return only movies and TV shows from the results
    const filteredResults = results.results.filter(
      (item) => item.media_type === 'movie' || item.media_type === 'tv'
    );
    
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
    
    if (genre) {
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