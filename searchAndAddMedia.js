// server/searchAndAddMedia.js
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const tmdbService = require('./services/tmdbService');

async function searchAndAddMedia() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Process command line arguments
    const args = process.argv.slice(2);
    const searchQuery = args.join(' ');

    if (!searchQuery) {
      console.log('Please provide a search query');
      console.log('Usage: npm run search-add -- "movie or show title"');
      return;
    }

    console.log(`Searching for: "${searchQuery}"`);
    
    // Search for media using TMDB API
    const searchResults = await tmdbService.searchMedia(searchQuery);
    
    if (!searchResults.results || searchResults.results.length === 0) {
      console.log('No results found for your search query');
      return;
    }

    // Display search results
    console.log(`Found ${searchResults.results.length} results:`);
    searchResults.results.forEach((item, index) => {
      if (item.media_type === 'movie' || item.media_type === 'tv') {
        const title = item.media_type === 'movie' ? item.title : item.name;
        const year = item.media_type === 'movie' 
          ? (item.release_date ? item.release_date.substring(0, 4) : 'N/A')
          : (item.first_air_date ? item.first_air_date.substring(0, 4) : 'N/A');
        console.log(`${index + 1}. [${item.media_type.toUpperCase()}] ${title} (${year}) - ID: ${item.id}`);
      }
    });

    // Prompt for selection (in a real interactive environment)
    console.log('\nTo add one of these to your database, run:');
    console.log('npm run add-media -- movie [TMDB_ID]  # For movies');
    console.log('npm run add-media -- tv [TMDB_ID]     # For TV shows');
    
    // Example: Add the first result automatically if it's a movie or TV show
    const firstResult = searchResults.results.find(item => 
      item.media_type === 'movie' || item.media_type === 'tv'
    );
    
    if (firstResult) {
      console.log('\nAdding the first result to your database...');
      
      if (firstResult.media_type === 'movie') {
        const movie = await tmdbService.fetchAndStoreMovie(firstResult.id);
        console.log(`Added movie: ${movie.title}`);
      } else if (firstResult.media_type === 'tv') {
        const tvShow = await tmdbService.fetchAndStoreTV(firstResult.id);
        console.log(`Added TV show: ${tvShow.title}`);
      }
    }

  } catch (error) {
    console.error('Error searching and adding media:', error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
searchAndAddMedia(); 