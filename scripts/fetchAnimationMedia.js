require('dotenv').config();
const mongoose = require('mongoose');
const tmdbService = require('../services/tmdbService');
const Media = require('../models/Media');

// Animation genre ID is 16 for both movies and TV shows
const ANIMATION_GENRE_ID = 16;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fetchAnimationMedia() {
  try {
    console.log('Starting to fetch animation media...');
    
    // Fetch animation movies - first 2 pages
    for (let page = 1; page <= 2; page++) {
      console.log(`Fetching animation movies page ${page}...`);
      const movieResults = await tmdbService.getByGenre('movie', ANIMATION_GENRE_ID, page);
      
      if (movieResults && movieResults.results && movieResults.results.length > 0) {
        console.log(`Found ${movieResults.results.length} animation movies on page ${page}`);
        
        for (const movie of movieResults.results) {
          try {
            // Check if movie already exists in our database
            const existingMovie = await Media.findOne({ tmdbId: movie.id, type: 'movie' });
            
            if (!existingMovie) {
              console.log(`Fetching and storing movie: ${movie.title} (ID: ${movie.id})`);
              await tmdbService.fetchAndStoreMovie(movie.id);
            } else {
              console.log(`Movie already exists: ${movie.title} (ID: ${movie.id})`);
            }
          } catch (error) {
            console.error(`Error processing movie ${movie.title || movie.id}:`, error.message);
          }
        }
      }
    }
    
    // Fetch animation TV shows - first 2 pages
    for (let page = 1; page <= 2; page++) {
      console.log(`Fetching animation TV shows page ${page}...`);
      const tvResults = await tmdbService.getByGenre('tv', ANIMATION_GENRE_ID, page);
      
      if (tvResults && tvResults.results && tvResults.results.length > 0) {
        console.log(`Found ${tvResults.results.length} animation TV shows on page ${page}`);
        
        for (const show of tvResults.results) {
          try {
            // Check if TV show already exists in our database
            const existingShow = await Media.findOne({ tmdbId: show.id, type: 'tv' });
            
            if (!existingShow) {
              console.log(`Fetching and storing TV show: ${show.name} (ID: ${show.id})`);
              await tmdbService.fetchAndStoreTV(show.id);
            } else {
              console.log(`TV show already exists: ${show.name} (ID: ${show.id})`);
            }
          } catch (error) {
            console.error(`Error processing TV show ${show.name || show.id}:`, error.message);
          }
        }
      }
    }
    
    console.log('Animation media fetch and store process completed');
  } catch (error) {
    console.error('Error fetching animation media:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
fetchAnimationMedia(); 