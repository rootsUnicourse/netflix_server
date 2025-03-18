require('dotenv').config();
const mongoose = require('mongoose');
const tmdbService = require('../services/tmdbService');
const Media = require('../models/Media');
const axios = require('axios');

// Animation genre ID is 16 for both movies and TV shows
const ANIMATION_GENRE_ID = 16;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Connect to MongoDB - use the correct environment variable name
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Direct API call to get popular animated content with proper sorting
async function fetchFromTMDB(endpoint, params = {}) {
  try {
    const url = `${TMDB_BASE_URL}${endpoint}`;
    
    // Use the existing tmdbService to make the API call since it has the correct auth setup
    const response = await tmdbService.fetchFromTMDB(endpoint, params);
    return response;
  } catch (error) {
    console.error(`Error fetching from TMDB API (${endpoint}):`, error.message);
    throw error;
  }
}

async function fetchPopularAnimationMedia() {
  try {
    console.log('Starting to fetch popular animation media...');
    
    // Well-known popular animation movies to add specifically
    const popularAnimationMovies = [
      142061, // Demon Slayer: Kimetsu no Yaiba - To the Hashira Training
      1011985, // Kung Fu Panda 4
      508883, // The Boy and the Heron
      976573, // Elemental
      502356, // The Super Mario Bros. Movie
      4465, // The Lion King
      155262, // Sword Art Online Progressive: Scherzo of Deep Night
      572154, // The First Slam Dunk
      8392, // My Neighbor Totoro
      128, // Princess Mononoke
    ];
    
    // Well-known popular animation TV shows to add specifically
    const popularAnimationTVShows = [
      206559, // Solo Leveling
      61889, // One Piece
      60625, // Rick and Morty
      37854, // One Punch Man
      64196, // Demon Slayer: Kimetsu no Yaiba
      114410, // Arcane
      85937, // Jujutsu Kaisen
      69478, // Attack on Titan
      95557, // Invincible
      65930, // My Hero Academia
    ];
    
    console.log('Fetching popular animation movies from TMDB...');
    
    // Fetch popular animation movies using the tmdbService
    try {
      // Use the discover endpoint with appropriate parameters
      const movieDiscoverResults = await tmdbService.fetchFromTMDB('/discover/movie', {
        with_genres: ANIMATION_GENRE_ID,
        sort_by: 'popularity.desc',
        page: 1,
        'vote_average.gte': 7,
        'vote_count.gte': 100
      });
      
      if (movieDiscoverResults && movieDiscoverResults.results) {
        console.log(`Found ${movieDiscoverResults.results.length} popular animation movies via discover`);
      }
      
      // Fetch popular animation TV shows using the tmdbService
      console.log('Fetching popular animation TV shows from TMDB...');
      const tvDiscoverResults = await tmdbService.fetchFromTMDB('/discover/tv', {
        with_genres: ANIMATION_GENRE_ID,
        sort_by: 'popularity.desc',
        page: 1,
        'vote_average.gte': 7,
        'vote_count.gte': 100
      });
      
      if (tvDiscoverResults && tvDiscoverResults.results) {
        console.log(`Found ${tvDiscoverResults.results.length} popular animation TV shows via discover`);
      }
      
      // Process discovered results and popular lists here...
      
      // Add discovered popular animation movies to database
      if (movieDiscoverResults && movieDiscoverResults.results) {
        console.log('Adding discovered popular animation movies to database...');
        
        for (const movie of movieDiscoverResults.results) {
          try {
            // Check if movie already exists in our database
            const existingMovie = await Media.findOne({ tmdbId: movie.id, type: 'movie' });
            
            if (!existingMovie) {
              console.log(`Fetching and storing discovered movie: ${movie.title} (ID: ${movie.id})`);
              await tmdbService.fetchAndStoreMovie(movie.id);
            } else {
              console.log(`Discovered movie already exists: ${movie.title} (ID: ${movie.id})`);
            }
          } catch (error) {
            console.error(`Error processing discovered movie ${movie.title || movie.id}:`, error.message);
          }
        }
      }
      
      // Add discovered popular animation TV shows to database
      if (tvDiscoverResults && tvDiscoverResults.results) {
        console.log('Adding discovered popular animation TV shows to database...');
        
        for (const show of tvDiscoverResults.results) {
          try {
            // Check if TV show already exists in our database
            const existingShow = await Media.findOne({ tmdbId: show.id, type: 'tv' });
            
            if (!existingShow) {
              console.log(`Fetching and storing discovered TV show: ${show.name} (ID: ${show.id})`);
              await tmdbService.fetchAndStoreTV(show.id);
            } else {
              console.log(`Discovered TV show already exists: ${show.name} (ID: ${show.id})`);
            }
          } catch (error) {
            console.error(`Error processing discovered TV show ${show.name || show.id}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error with discover endpoints:', error.message);
      console.log('Continuing with hardcoded IDs...');
    }
    
    // Add well-known popular animation movies from our hardcoded list
    console.log('Adding specific well-known popular animation movies...');
    for (const movieId of popularAnimationMovies) {
      try {
        // Check if movie already exists in our database
        const existingMovie = await Media.findOne({ tmdbId: movieId, type: 'movie' });
        
        if (!existingMovie) {
          console.log(`Fetching and storing popular movie ID: ${movieId}`);
          await tmdbService.fetchAndStoreMovie(movieId);
        } else {
          console.log(`Popular movie already exists ID: ${movieId} (${existingMovie.title})`);
        }
      } catch (error) {
        console.error(`Error processing movie ID ${movieId}:`, error.message);
      }
    }
    
    // Add well-known popular animation TV shows from our hardcoded list
    console.log('Adding specific well-known popular animation TV shows...');
    for (const showId of popularAnimationTVShows) {
      try {
        // Check if TV show already exists in our database
        const existingShow = await Media.findOne({ tmdbId: showId, type: 'tv' });
        
        if (!existingShow) {
          console.log(`Fetching and storing popular TV show ID: ${showId}`);
          await tmdbService.fetchAndStoreTV(showId);
        } else {
          console.log(`Popular TV show already exists ID: ${showId} (${existingShow.title})`);
        }
      } catch (error) {
        console.error(`Error processing TV show ID ${showId}:`, error.message);
      }
    }
    
    console.log('Popular animation media fetch and store process completed');
  } catch (error) {
    console.error('Error fetching popular animation media:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
fetchPopularAnimationMedia(); 