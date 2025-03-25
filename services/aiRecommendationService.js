const axios = require('axios');
const tmdbService = require('./tmdbService');

class AIRecommendationService {
  constructor() {
    this.tmdbService = tmdbService;
  }

  /**
   * Get AI-powered recommendations based on user's watchlist
   * 
   * @param {Array} watchlist - User's watchlist items
   * @param {String} mediaType - Type of media to recommend (movie, tv, or all)
   * @param {Number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of recommended media items
   */
  async getPersonalizedRecommendations(watchlist, mediaType = 'all', limit = 10) {
    try {
      // If watchlist is empty, return trending media
      if (!watchlist || watchlist.length === 0) {
        console.log('Watchlist is empty, returning trending media');
        const trending = await this.tmdbService.getTrending(mediaType === 'all' ? 'all' : mediaType);
        return trending.results.slice(0, limit);
      }

      // Extract TMDb IDs from watchlist
      const relevantWatchlist = mediaType !== 'all' 
        ? watchlist.filter(item => item.type === mediaType)
        : watchlist;

      if (relevantWatchlist.length === 0) {
        console.log(`No ${mediaType} items in watchlist, returning trending media`);
        const trending = await this.tmdbService.getTrending(mediaType === 'all' ? 'all' : mediaType);
        return trending.results.slice(0, limit);
      }

      // Get TMDb IDs from watchlist
      const tmdbIds = relevantWatchlist.map(item => ({
        id: item.tmdbId,
        type: item.type
      }));
      
      // Get all genres from user's watchlist
      const userGenres = new Set();
      relevantWatchlist.forEach(item => {
        if (item.genres && Array.isArray(item.genres)) {
          item.genres.forEach(genre => userGenres.add(genre));
        }
      });

      // Use TMDb recommendation API for each item in the watchlist
      const recommendationPromises = tmdbIds.map(async ({ id, type }) => {
        try {
          // Use TMDb's recommendation endpoint
          const recommendations = await this.tmdbService.fetchFromTMDB(
            `/${type}/${id}/recommendations`
          );
          return recommendations.results || [];
        } catch (error) {
          console.error(`Error getting recommendations for ${type} ${id}:`, error.message);
          return [];
        }
      });

      // Wait for all recommendation requests to complete
      const allRecommendations = await Promise.all(recommendationPromises);
      
      // Flatten the array of recommendations
      let combinedRecommendations = allRecommendations.flat();
      
      // Remove duplicates based on TMDb ID
      const uniqueRecommendations = Array.from(
        new Map(combinedRecommendations.map(item => [item.id, item])).values()
      );
      
      // Filter out items already in the user's watchlist
      const watchlistTmdbIds = new Set(tmdbIds.map(item => item.id));
      const filteredRecommendations = uniqueRecommendations.filter(
        item => !watchlistTmdbIds.has(item.id)
      );

      // Calculate relevance score for each recommendation based on genre match
      const scoredRecommendations = filteredRecommendations.map(item => {
        let score = 0;
        
        // Get item genres from TMDb data
        const itemGenres = item.genre_ids?.map(genreId => {
          // Convert genre IDs to names using a mapping function
          // This is a simplification - in a real app, you'd have a more robust genre mapping
          return AIRecommendationService.getGenreName(genreId, item.media_type || 'movie');
        }) || [];
        
        // Count genre matches
        itemGenres.forEach(genre => {
          if (userGenres.has(genre)) {
            score += 1;
          }
        });
        
        // Add popularity as a factor in the score
        score += (item.popularity || 0) / 100;
        
        return { ...item, score };
      });
      
      // Sort by score (descending)
      scoredRecommendations.sort((a, b) => b.score - a.score);
      
      // Return top N recommendations
      return scoredRecommendations.slice(0, limit);
    } catch (error) {
      console.error('Error in AI recommendation service:', error.message);
      throw error;
    }
  }
  
  // Helper method to convert genre ID to name
  static getGenreName(genreId, mediaType = 'movie') {
    // Common movie genres
    const movieGenres = {
      28: 'Action',
      12: 'Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      14: 'Fantasy',
      36: 'History',
      27: 'Horror',
      10402: 'Music',
      9648: 'Mystery',
      10749: 'Romance',
      878: 'Science Fiction',
      10770: 'TV Movie',
      53: 'Thriller',
      10752: 'War',
      37: 'Western'
    };
    
    // Common TV genres
    const tvGenres = {
      10759: 'Action & Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      10762: 'Kids',
      9648: 'Mystery',
      10763: 'News',
      10764: 'Reality',
      10765: 'Sci-Fi & Fantasy',
      10766: 'Soap',
      10767: 'Talk',
      10768: 'War & Politics',
      37: 'Western'
    };
    
    return mediaType === 'tv' 
      ? tvGenres[genreId] || 'Unknown'
      : movieGenres[genreId] || 'Unknown';
  }
  
  // Non-static version of getGenreName for backward compatibility
  getGenreName(genreId, mediaType = 'movie') {
    return AIRecommendationService.getGenreName(genreId, mediaType);
  }
}

module.exports = new AIRecommendationService(); 