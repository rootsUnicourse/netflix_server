const axios = require('axios');
const Media = require('../models/Media');

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

// Image sizes
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'original';
const PROFILE_SIZE = 'w185';

class TMDBService {
  constructor() {
    if (!TMDB_API_KEY) {
      console.warn('TMDB API key is not defined in environment variables');
    }
  }

  // Helper method to make API requests to TMDB
  async fetchFromTMDB(endpoint, params = {}) {
    try {
      // Check if the API key is a JWT token (starts with "ey")
      const isJwtToken = TMDB_API_KEY.startsWith('ey');
      
      let config = {};
      
      if (isJwtToken) {
        // Use Authorization header with Bearer token
        config = {
          headers: {
            Authorization: `Bearer ${TMDB_API_KEY}`
          },
          params
        };
      } else {
        // Use api_key as query parameter (old method)
        config = {
          params: {
            api_key: TMDB_API_KEY,
            ...params
          }
        };
      }
      
      const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, config);
      return response.data;
    } catch (error) {
      console.error('Error fetching from TMDB:', error.message);
      if (error.response) {
        console.error('TMDB API Response:', error.response.status, error.response.data);
      }
      throw error;
    }
  }

  // Get movie details by TMDB ID
  async getMovieDetails(movieId) {
    return this.fetchFromTMDB(`/movie/${movieId}`, {
      append_to_response: 'videos,credits',
    });
  }

  // Get TV show details by TMDB ID
  async getTVShowDetails(tvId) {
    return this.fetchFromTMDB(`/tv/${tvId}`, {
      append_to_response: 'videos,credits',
    });
  }

  // Search for movies and TV shows
  async searchMedia(query, page = 1) {
    return this.fetchFromTMDB('/search/multi', { query, page });
  }

  // Get trending movies and TV shows
  async getTrending(mediaType = 'all', timeWindow = 'week') {
    return this.fetchFromTMDB(`/trending/${mediaType}/${timeWindow}`);
  }

  // Get popular movies or TV shows
  async getPopular(mediaType, page = 1) {
    return this.fetchFromTMDB(`/${mediaType}/popular`, { page });
  }

  // Get top rated movies or TV shows
  async getTopRated(mediaType, page = 1) {
    return this.fetchFromTMDB(`/${mediaType}/top_rated`, { page });
  }

  // Get movies or TV shows by genre
  async getByGenre(mediaType, genreId, page = 1) {
    return this.fetchFromTMDB(`/discover/${mediaType}`, {
      with_genres: genreId,
      page,
    });
  }

  // Transform TMDB movie data to our Media model format
  transformMovieData(tmdbMovie) {
    // Find trailer video if available
    const trailerVideo = tmdbMovie.videos?.results.find(
      (video) => video.type === 'Trailer' && video.site === 'YouTube'
    );

    return {
      tmdbId: tmdbMovie.id,
      title: tmdbMovie.title,
      type: 'movie',
      overview: tmdbMovie.overview,
      posterPath: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE_URL}${POSTER_SIZE}${tmdbMovie.poster_path}` : null,
      backdropPath: tmdbMovie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${BACKDROP_SIZE}${tmdbMovie.backdrop_path}` : null,
      genres: tmdbMovie.genres.map((genre) => genre.name),
      releaseDate: tmdbMovie.release_date ? new Date(tmdbMovie.release_date) : null,
      popularity: tmdbMovie.popularity,
      voteAverage: tmdbMovie.vote_average,
      voteCount: tmdbMovie.vote_count,
      runtime: tmdbMovie.runtime,
      status: tmdbMovie.status,
      originalLanguage: tmdbMovie.original_language,
      cast: tmdbMovie.credits?.cast.slice(0, 10).map((actor) => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        profilePath: actor.profile_path ? `${TMDB_IMAGE_BASE_URL}${PROFILE_SIZE}${actor.profile_path}` : null,
      })) || [],
      trailerKey: trailerVideo?.key || null,
      // Set local management fields based on criteria
      newRelease: tmdbMovie.release_date ? 
        (new Date().getTime() - new Date(tmdbMovie.release_date).getTime() < 90 * 24 * 60 * 60 * 1000) : false, // 90 days
    };
  }

  // Transform TMDB TV show data to our Media model format
  transformTVData(tmdbTV) {
    // Find trailer video if available
    const trailerVideo = tmdbTV.videos?.results.find(
      (video) => video.type === 'Trailer' && video.site === 'YouTube'
    );

    return {
      tmdbId: tmdbTV.id,
      title: tmdbTV.name,
      type: 'tv',
      overview: tmdbTV.overview,
      posterPath: tmdbTV.poster_path ? `${TMDB_IMAGE_BASE_URL}${POSTER_SIZE}${tmdbTV.poster_path}` : null,
      backdropPath: tmdbTV.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${BACKDROP_SIZE}${tmdbTV.backdrop_path}` : null,
      genres: tmdbTV.genres.map((genre) => genre.name),
      releaseDate: tmdbTV.first_air_date ? new Date(tmdbTV.first_air_date) : null,
      popularity: tmdbTV.popularity,
      voteAverage: tmdbTV.vote_average,
      voteCount: tmdbTV.vote_count,
      seasons: tmdbTV.number_of_seasons,
      status: tmdbTV.status,
      originalLanguage: tmdbTV.original_language,
      cast: tmdbTV.credits?.cast.slice(0, 10).map((actor) => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        profilePath: actor.profile_path ? `${TMDB_IMAGE_BASE_URL}${PROFILE_SIZE}${actor.profile_path}` : null,
      })) || [],
      trailerKey: trailerVideo?.key || null,
      // Set local management fields based on criteria
      newRelease: tmdbTV.first_air_date ? 
        (new Date().getTime() - new Date(tmdbTV.first_air_date).getTime() < 90 * 24 * 60 * 60 * 1000) : false, // 90 days
    };
  }

  // Fetch and store movie in our database
  async fetchAndStoreMovie(movieId) {
    try {
      // Check if movie already exists in our database
      let media = await Media.findOne({ tmdbId: movieId, type: 'movie' });
      
      if (!media) {
        const tmdbMovie = await this.getMovieDetails(movieId);
        const movieData = this.transformMovieData(tmdbMovie);
        media = await Media.create(movieData);
      }
      
      return media;
    } catch (error) {
      console.error(`Error fetching and storing movie ${movieId}:`, error.message);
      throw error;
    }
  }

  // Fetch and store TV show in our database
  async fetchAndStoreTV(tvId) {
    try {
      // Check if TV show already exists in our database
      let media = await Media.findOne({ tmdbId: tvId, type: 'tv' });
      
      if (!media) {
        const tmdbTV = await this.getTVShowDetails(tvId);
        const tvData = this.transformTVData(tmdbTV);
        media = await Media.create(tvData);
      }
      
      return media;
    } catch (error) {
      console.error(`Error fetching and storing TV show ${tvId}:`, error.message);
      throw error;
    }
  }

  // Sync trending media from TMDB to our database
  async syncTrendingMedia() {
    try {
      // Get trending movies and TV shows
      const trendingData = await this.getTrending();
      
      // Process each trending item
      for (const item of trendingData.results) {
        if (item.media_type === 'movie') {
          const movie = await this.fetchAndStoreMovie(item.id);
          // Update trending flag
          await Media.findByIdAndUpdate(movie._id, { trending: true });
        } else if (item.media_type === 'tv') {
          const tvShow = await this.fetchAndStoreTV(item.id);
          // Update trending flag
          await Media.findByIdAndUpdate(tvShow._id, { trending: true });
        }
      }
      
      // Reset trending flag for items no longer trending
      const trendingIds = trendingData.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .map(item => item.id);
      
      await Media.updateMany(
        { tmdbId: { $nin: trendingIds }, trending: true },
        { trending: false }
      );
      
      return { success: true, count: trendingData.results.length };
    } catch (error) {
      console.error('Error syncing trending media:', error.message);
      throw error;
    }
  }
}

module.exports = new TMDBService(); 