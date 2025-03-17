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
      append_to_response: 'videos,credits,images,release_dates,keywords',
    });
  }

  // Get TV show details by TMDB ID
  async getTVShowDetails(tvId) {
    return this.fetchFromTMDB(`/tv/${tvId}`, {
      append_to_response: 'videos,credits,images,content_ratings,keywords',
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

  // Get popular movies or TV shows by region
  async getPopularByRegion(mediaType, region = 'IL', page = 1) {
    return this.fetchFromTMDB(`/${mediaType}/popular`, { 
      page,
      region
    });
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

    // Find director from crew
    const director = tmdbMovie.credits?.crew.find(
      (person) => person.job === 'Director'
    );

    // Get content tags from keywords
    const contentTags = tmdbMovie.keywords?.keywords.map(keyword => keyword.name) || [];

    // Get maturity rating (US rating if available, otherwise first available)
    let maturityRating = 'Not Rated';
    if (tmdbMovie.release_dates?.results) {
      const usRatings = tmdbMovie.release_dates.results.find(
        country => country.iso_3166_1 === 'US'
      );
      
      if (usRatings && usRatings.release_dates && usRatings.release_dates.length > 0) {
        const rating = usRatings.release_dates.find(date => date.certification);
        if (rating && rating.certification) {
          maturityRating = rating.certification;
        }
      } else if (tmdbMovie.release_dates.results.length > 0) {
        // Use first available rating if US not available
        for (const country of tmdbMovie.release_dates.results) {
          if (country.release_dates && country.release_dates.length > 0) {
            const rating = country.release_dates.find(date => date.certification);
            if (rating && rating.certification) {
              maturityRating = `${rating.certification} (${country.iso_3166_1})`;
              break;
            }
          }
        }
      }
    }

    // Get additional images (backdrops)
    const additionalImages = tmdbMovie.images?.backdrops
      .slice(0, 3)
      .map(image => `${TMDB_IMAGE_BASE_URL}${BACKDROP_SIZE}${image.file_path}`) || [];

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
      // New fields
      director: director ? director.name : null,
      contentTags: contentTags,
      maturityRating: maturityRating,
      additionalImages: additionalImages,
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

    // Find creators/showrunners
    const creators = tmdbTV.created_by?.map(person => person.name) || [];

    // Get content tags from keywords
    const contentTags = tmdbTV.keywords?.results?.map(keyword => keyword.name) || [];

    // Get maturity rating (US rating if available, otherwise first available)
    let maturityRating = 'Not Rated';
    if (tmdbTV.content_ratings?.results) {
      const usRating = tmdbTV.content_ratings.results.find(
        country => country.iso_3166_1 === 'US'
      );
      
      if (usRating && usRating.rating) {
        maturityRating = usRating.rating;
      } else if (tmdbTV.content_ratings.results.length > 0) {
        // Use first available rating if US not available
        const firstRating = tmdbTV.content_ratings.results[0];
        if (firstRating.rating) {
          maturityRating = `${firstRating.rating} (${firstRating.iso_3166_1})`;
        }
      }
    }

    // Get additional images (backdrops)
    const additionalImages = tmdbTV.images?.backdrops
      .slice(0, 3)
      .map(image => `${TMDB_IMAGE_BASE_URL}${BACKDROP_SIZE}${image.file_path}`) || [];

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
      // New fields
      creators: creators,
      contentTags: contentTags,
      maturityRating: maturityRating,
      additionalImages: additionalImages,
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

  // Sync popular movies from TMDB to our database
  async syncPopularMovies(limit = 10) {
    try {
      // Get popular movies
      const popularData = await this.getPopular('movie');
      
      // Process each popular movie (up to the limit)
      const moviesToProcess = popularData.results.slice(0, limit);
      
      for (const movie of moviesToProcess) {
        await this.fetchAndStoreMovie(movie.id);
      }
      
      return { success: true, count: moviesToProcess.length };
    } catch (error) {
      console.error('Error syncing popular movies:', error.message);
      throw error;
    }
  }

  // Sync popular TV shows from TMDB to our database
  async syncPopularTVShows(limit = 10) {
    try {
      // Get popular TV shows
      const popularData = await this.getPopular('tv');
      
      // Process each popular TV show (up to the limit)
      const tvShowsToProcess = popularData.results.slice(0, limit);
      
      for (const tvShow of tvShowsToProcess) {
        await this.fetchAndStoreTV(tvShow.id);
      }
      
      return { success: true, count: tvShowsToProcess.length };
    } catch (error) {
      console.error('Error syncing popular TV shows:', error.message);
      throw error;
    }
  }

  // Sync top rated movies from TMDB to our database
  async syncTopRatedMovies(limit = 10) {
    try {
      // Get top rated movies
      const topRatedData = await this.getTopRated('movie');
      
      // Process each top rated movie (up to the limit)
      const moviesToProcess = topRatedData.results.slice(0, limit);
      
      for (const movie of moviesToProcess) {
        await this.fetchAndStoreMovie(movie.id);
      }
      
      return { success: true, count: moviesToProcess.length };
    } catch (error) {
      console.error('Error syncing top rated movies:', error.message);
      throw error;
    }
  }

  // Sync top rated TV shows from TMDB to our database
  async syncTopRatedTVShows(limit = 10) {
    try {
      // Get top rated TV shows
      const topRatedData = await this.getTopRated('tv');
      
      // Process each top rated TV show (up to the limit)
      const tvShowsToProcess = topRatedData.results.slice(0, limit);
      
      for (const tvShow of tvShowsToProcess) {
        await this.fetchAndStoreTV(tvShow.id);
      }
      
      return { success: true, count: tvShowsToProcess.length };
    } catch (error) {
      console.error('Error syncing top rated TV shows:', error.message);
      throw error;
    }
  }

  // Seed the database with initial content
  async seedDatabase() {
    try {
      console.log('Starting database seeding with TMDB content...');
      
      // Check if we already have content
      const mediaCount = await Media.countDocuments();
      
      if (mediaCount > 0) {
        console.log(`Database already has ${mediaCount} media items. Skipping seeding.`);
        return { success: true, skipped: true, existingCount: mediaCount };
      }
      
      // Sync trending, popular, and top-rated content
      await this.syncTrendingMedia();
      await this.syncPopularMovies(10);
      await this.syncPopularTVShows(10);
      await this.syncTopRatedMovies(5);
      await this.syncTopRatedTVShows(5);
      
      const newCount = await Media.countDocuments();
      console.log(`Database seeding complete. Added ${newCount} media items.`);
      
      return { success: true, count: newCount };
    } catch (error) {
      console.error('Error seeding database:', error.message);
      throw error;
    }
  }
}

module.exports = new TMDBService(); 