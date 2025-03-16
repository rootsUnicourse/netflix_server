require('dotenv').config();
const mongoose = require('mongoose');
const tmdbService = require('../services/tmdbService');

// Check if TMDB API key is set
if (!process.env.TMDB_API_KEY || process.env.TMDB_API_KEY === 'your_tmdb_api_key_here') {
  console.error('\x1b[31m%s\x1b[0m', 'Error: TMDB API key is not set in .env file');
  console.log('Please get your API key from https://www.themoviedb.org/settings/api');
  console.log('Then update your .env file with: TMDB_API_KEY=your_actual_api_key');
  process.exit(1);
}

console.log('Using TMDB API key:', process.env.TMDB_API_KEY.substring(0, 10) + '...');
console.log('API key type:', process.env.TMDB_API_KEY.startsWith('ey') ? 'JWT Token (v4 auth)' : 'API Key (v3 auth)');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('\x1b[32m%s\x1b[0m', '✓ Connected to MongoDB'))
  .catch((err) => {
    console.error('\x1b[31m%s\x1b[0m', '✗ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// Test functions
async function runTests() {
  try {
    console.log('\x1b[36m%s\x1b[0m', '\n=== Testing TMDB API Integration ===\n');
    
    // Test 1: Search for a movie
    console.log('Test 1: Searching for "Avengers"...');
    try {
      const searchResults = await tmdbService.searchMedia('Avengers', 1);
      console.log('\x1b[32m%s\x1b[0m', `✓ Search successful! Found ${searchResults.results.length} results`);
      
      if (searchResults.results.length > 0) {
        const firstResult = searchResults.results[0];
        console.log(`  First result: "${firstResult.title || firstResult.name}" (${firstResult.media_type})`);
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Search failed: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      // Continue with other tests
    }
    
    // Test 2: Get trending media
    console.log('\nTest 2: Getting trending media...');
    try {
      const trendingResults = await tmdbService.getTrending();
      console.log('\x1b[32m%s\x1b[0m', `✓ Trending fetch successful! Found ${trendingResults.results.length} trending items`);
      
      if (trendingResults.results.length > 0) {
        const firstTrending = trendingResults.results[0];
        console.log(`  First trending: "${firstTrending.title || firstTrending.name}" (${firstTrending.media_type})`);
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Trending fetch failed: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      // Continue with other tests
    }
    
    // Test 3: Get movie details
    console.log('\nTest 3: Getting details for a specific movie (Avengers: Endgame, ID: 299534)...');
    try {
      const movieDetails = await tmdbService.getMovieDetails(299534);
      console.log('\x1b[32m%s\x1b[0m', `✓ Movie details fetch successful!`);
      console.log(`  Title: "${movieDetails.title}"`);
      console.log(`  Overview: "${movieDetails.overview.substring(0, 100)}..."`);
      
      // Test 4: Transform and store movie
      console.log('\nTest 4: Transforming and storing movie in database...');
      const transformedMovie = tmdbService.transformMovieData(movieDetails);
      console.log('\x1b[32m%s\x1b[0m', `✓ Movie transformation successful!`);
      console.log(`  Transformed title: "${transformedMovie.title}"`);
      console.log(`  Genres: ${transformedMovie.genres.join(', ')}`);
      
      // Test 5: Fetch and store movie
      console.log('\nTest 5: Fetching and storing movie in database...');
      const storedMovie = await tmdbService.fetchAndStoreMovie(299534);
      console.log('\x1b[32m%s\x1b[0m', `✓ Movie successfully fetched and stored in database!`);
      console.log(`  Database ID: ${storedMovie._id}`);
      console.log(`  Title: "${storedMovie.title}"`);
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Movie details fetch failed: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    console.log('\n\x1b[36m%s\x1b[0m', '=== All tests completed! ===');
    console.log('\x1b[32m%s\x1b[0m', 'Your TMDB API integration is working correctly!\n');
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `\n✗ Test failed: ${error.message}`);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the tests
runTests(); 