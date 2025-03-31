const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Helper function to get full image URL
const getTMDBImageUrl = (path) => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/original${path}`;
};

// Get popular media (movies and TV shows)
const getPopularMedia = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    
    // Fetch popular movies
    const moviesResponse = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1
      }
    });

    // Fetch popular TV shows
    const tvShowsResponse = await axios.get(`${TMDB_BASE_URL}/tv/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1
      }
    });

    // Combine and format the results
    const movies = moviesResponse.data.results.map(movie => ({
      id: movie.id,
      tmdbId: movie.id,
      title: movie.title,
      type: 'movie',
      posterPath: getTMDBImageUrl(movie.poster_path),
      backdropPath: getTMDBImageUrl(movie.backdrop_path),
      overview: movie.overview,
      releaseDate: movie.release_date,
      voteAverage: movie.vote_average,
      genres: movie.genre_ids // We'll fetch genre names if needed
    }));

    const tvShows = tvShowsResponse.data.results.map(show => ({
      id: show.id,
      tmdbId: show.id,
      title: show.name,
      type: 'tv',
      posterPath: getTMDBImageUrl(show.poster_path),
      backdropPath: getTMDBImageUrl(show.backdrop_path),
      overview: show.overview,
      releaseDate: show.first_air_date,
      voteAverage: show.vote_average,
      genres: show.genre_ids // We'll fetch genre names if needed
    }));

    // Combine and sort by popularity
    const allMedia = [...movies, ...tvShows]
      .sort((a, b) => b.voteAverage - a.voteAverage)
      .slice(0, limit);

    res.json(allMedia);
  } catch (error) {
    console.error('Error fetching popular media:', error);
    res.status(500).json({ message: 'Error fetching popular media' });
  }
};

module.exports = {
  getPopularMedia
}; 