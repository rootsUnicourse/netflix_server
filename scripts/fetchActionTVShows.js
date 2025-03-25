require('dotenv').config();
const mongoose = require('mongoose');
const tmdbService = require('../services/tmdbService');
const Media = require('../models/Media');

// Action & Adventure genre ID for TV shows
const ACTION_GENRE_ID = 10759;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fetchActionTVShows() {
  try {
    console.log('Starting Action TV show fetch process...');
    
    // Fetch Action TV shows - multiple pages to ensure we get enough content
    for (let page = 1; page <= 5; page++) {
      console.log(`Fetching Action TV shows page ${page}...`);
      const tvResults = await tmdbService.getByGenre('tv', ACTION_GENRE_ID, page);
      
      if (tvResults && tvResults.results && tvResults.results.length > 0) {
        console.log(`Found ${tvResults.results.length} Action TV shows on page ${page}`);
        
        for (const show of tvResults.results) {
          try {
            // Check if TV show already exists in our database
            const existingShow = await Media.findOne({ tmdbId: show.id, type: 'tv' });
            
            if (!existingShow) {
              console.log(`Fetching and storing Action TV show: ${show.name} (ID: ${show.id})`);
              await tmdbService.fetchAndStoreTV(show.id);
            } else {
              console.log(`Action TV show already exists: ${show.name} (ID: ${show.id})`);
            }
          } catch (error) {
            console.error(`Error processing TV show ${show.name || show.id}:`, error.message);
          }
        }
      } else {
        console.log(`No more Action TV shows found on page ${page}, stopping pagination`);
        break;
      }
    }
    
    // Also fetch popular Action TV shows
    console.log('Fetching popular Action TV shows from TMDB...');
    const popularActionTVShows = await tmdbService.fetchFromTMDB('/discover/tv', {
      with_genres: ACTION_GENRE_ID,
      sort_by: 'popularity.desc',
      page: 1,
      'vote_average.gte': 7,
      'vote_count.gte': 100
    });
    
    if (popularActionTVShows && popularActionTVShows.results) {
      console.log(`Found ${popularActionTVShows.results.length} popular Action TV shows via discover`);
      
      for (const show of popularActionTVShows.results) {
        try {
          // Check if TV show already exists in our database
          const existingShow = await Media.findOne({ tmdbId: show.id, type: 'tv' });
          
          if (!existingShow) {
            console.log(`Fetching and storing popular Action TV show: ${show.name} (ID: ${show.id})`);
            await tmdbService.fetchAndStoreTV(show.id);
          } else {
            console.log(`Popular Action TV show already exists: ${show.name} (ID: ${show.id})`);
          }
        } catch (error) {
          console.error(`Error processing popular TV show ${show.name || show.id}:`, error.message);
        }
      }
    }
    
    console.log('Action TV show fetch and store process completed');
  } catch (error) {
    console.error('Error fetching Action TV shows:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Execute the function
fetchActionTVShows(); 