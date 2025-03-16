require('dotenv').config();
const mongoose = require('mongoose');
const tmdbService = require('./services/tmdbService');

// List of popular movies and TV shows to add (TMDB IDs)
const POPULAR_MOVIES = [
  299534,  // Avengers: Endgame
  299536,  // Avengers: Infinity War
  505642,  // Black Panther: Wakanda Forever
  634649,  // Spider-Man: No Way Home
  76600,   // Avatar: The Way of Water
  603692,  // John Wick: Chapter 4
  447365,  // Guardians of the Galaxy Vol. 3
  502356,  // The Super Mario Bros. Movie
  569094,  // Spider-Man: Across the Spider-Verse
  385687,  // Fast X
  385128,  // F9: The Fast Saga
  667538,  // Transformers: Rise of the Beasts
  640146,  // Ant-Man and the Wasp: Quantumania
  594767,  // Shazam! Fury of the Gods
  677179,  // Creed III
  493529,  // Dungeons & Dragons: Honor Among Thieves
  447277,  // The Little Mermaid
  298618,  // The Flash
  346698,  // Barbie
  346364,  // The Equalizer 3
];

const POPULAR_TV_SHOWS = [
  1396,    // Breaking Bad
  66732,   // Stranger Things
  1399,    // Game of Thrones
  60735,   // The Flash
  1402,    // The Walking Dead
  60625,   // Rick and Morty
  62286,   // Fear the Walking Dead
  71446,   // Money Heist
  1418,    // The Big Bang Theory
  63174,   // Lucifer
  62560,   // Mr. Robot
  1416,    // Grey's Anatomy
  2316,    // The Office
  4614,    // 3%
  79501,   // The Mandalorian
  76479,   // The Boys
  85271,   // WandaVision
  84958,   // Loki
  71712,   // The Good Doctor
  60574,   // Peaky Blinders
];

async function addMediaToDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Process command line arguments
    const args = process.argv.slice(2);
    const mediaType = args[0]; // 'movie', 'tv', or 'both'
    const tmdbId = args[1];    // specific TMDB ID if provided

    if (tmdbId) {
      // Add a specific movie or TV show
      if (mediaType === 'movie') {
        console.log(`Adding movie with TMDB ID: ${tmdbId}`);
        const movie = await tmdbService.fetchAndStoreMovie(tmdbId);
        console.log(`Added movie: ${movie.title}`);
      } else if (mediaType === 'tv') {
        console.log(`Adding TV show with TMDB ID: ${tmdbId}`);
        const tvShow = await tmdbService.fetchAndStoreTV(tmdbId);
        console.log(`Added TV show: ${tvShow.title}`);
      } else {
        console.error('Invalid media type. Use "movie" or "tv"');
      }
    } else if (mediaType === 'movie' || mediaType === 'both') {
      // Add popular movies
      console.log('Adding popular movies...');
      for (const movieId of POPULAR_MOVIES) {
        try {
          const movie = await tmdbService.fetchAndStoreMovie(movieId);
          console.log(`Added movie: ${movie.title}`);
        } catch (error) {
          console.error(`Error adding movie ${movieId}:`, error.message);
        }
      }
    }
    
    if (mediaType === 'tv' || mediaType === 'both') {
      // Add popular TV shows
      console.log('Adding popular TV shows...');
      for (const tvId of POPULAR_TV_SHOWS) {
        try {
          const tvShow = await tmdbService.fetchAndStoreTV(tvId);
          console.log(`Added TV show: ${tvShow.title}`);
        } catch (error) {
          console.error(`Error adding TV show ${tvId}:`, error.message);
        }
      }
    }

    console.log('Finished adding media to database!');
  } catch (error) {
    console.error('Error adding media to database:', error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Show usage if no arguments provided
if (process.argv.length <= 2) {
  console.log('Usage:');
  console.log('  npm run add-media -- both                # Add all popular movies and TV shows');
  console.log('  npm run add-media -- movie               # Add all popular movies');
  console.log('  npm run add-media -- tv                  # Add all popular TV shows');
  console.log('  npm run add-media -- movie 299534        # Add specific movie by TMDB ID');
  console.log('  npm run add-media -- tv 1396            # Add specific TV show by TMDB ID');
  process.exit(0);
}

// Run the function
addMediaToDatabase(); 