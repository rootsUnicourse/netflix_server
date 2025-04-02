const tmdbService = require('./tmdbService');

class ApiService {
  constructor() {
    this.tmdbService = tmdbService;
  }

  /**
   * Get TMDB details for a movie or TV show
   * 
   * @param {String} type - Type of media (movie or tv)
   * @param {Number} id - TMDB ID of the media
   * @returns {Promise<Object>} - Media details from TMDB
   */
  async getTMDBDetails(type, id) {
    try {
      if (!type || !id) {
        throw new Error('Type and ID are required');
      }

      let details;
      if (type === 'movie') {
        details = await this.tmdbService.getMovieDetails(id);
        return {
          id: details.id,
          title: details.title,
          name: null, // For consistency with TV shows
          overview: details.overview,
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          release_date: details.release_date,
          first_air_date: null, // For consistency with TV shows
          vote_average: details.vote_average,
          vote_count: details.vote_count,
          genres: details.genres,
          runtime: details.runtime,
          type: 'movie'
        };
      } else if (type === 'tv') {
        details = await this.tmdbService.getTVShowDetails(id);
        return {
          id: details.id,
          title: null, // For consistency with movies
          name: details.name,
          overview: details.overview,
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          release_date: null, // For consistency with movies
          first_air_date: details.first_air_date,
          vote_average: details.vote_average,
          vote_count: details.vote_count,
          genres: details.genres,
          number_of_seasons: details.number_of_seasons,
          type: 'tv'
        };
      } else {
        throw new Error(`Invalid media type: ${type}`);
      }
    } catch (error) {
      console.error(`Error getting TMDB details for ${type} ${id}:`, error);
      return null;
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
module.exports = apiService; 