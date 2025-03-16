require('dotenv').config();
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const MEDIA_ENDPOINT = `${API_BASE_URL}/media`;

// Check if server is running
async function checkServerStatus() {
  try {
    await axios.get(API_BASE_URL);
    console.log('\x1b[32m%s\x1b[0m', '✓ Server is running');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\x1b[31m%s\x1b[0m', '✗ Server is not running. Please start the server with "npm run dev" first.');
      return false;
    }
    // If we get any other error, the server is probably running but returned an error
    console.log('\x1b[32m%s\x1b[0m', '✓ Server is running (but returned an error)');
    return true;
  }
}

// Test functions
async function runTests() {
  console.log('\x1b[36m%s\x1b[0m', '\n=== Testing Media API Endpoints ===\n');
  
  // Check if server is running
  const isServerRunning = await checkServerStatus();
  if (!isServerRunning) {
    process.exit(1);
  }
  
  // Initialize movieId variable
  let movieId = null;
  
  try {
    // Test 1: Search for media
    console.log('\nTest 1: Searching for "Avengers"...');
    try {
      const searchResponse = await axios.get(`${MEDIA_ENDPOINT}/search`, {
        params: { query: 'Avengers' }
      });
      console.log('\x1b[32m%s\x1b[0m', `✓ Search endpoint working! Found ${searchResponse.data.results.length} results`);
      
      if (searchResponse.data.results.length > 0) {
        const firstResult = searchResponse.data.results[0];
        console.log(`  First result: "${firstResult.title || firstResult.name}" (${firstResult.media_type})`);
        
        // Save the first movie ID for later tests
        if (firstResult.media_type === 'movie') {
          movieId = firstResult.id;
        }
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Search endpoint failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Test 2: Get trending media
    console.log('\nTest 2: Getting trending media...');
    try {
      const trendingResponse = await axios.get(`${MEDIA_ENDPOINT}/trending`);
      console.log('\x1b[32m%s\x1b[0m', `✓ Trending endpoint working! Found ${trendingResponse.data.results.length} trending items`);
      
      if (trendingResponse.data.results.length > 0) {
        const firstTrending = trendingResponse.data.results[0];
        console.log(`  First trending: "${firstTrending.title || firstTrending.name}" (${firstTrending.media_type})`);
        
        // Use this ID for the next test if we don't have a movie ID yet
        if (!movieId && firstTrending.media_type === 'movie') {
          movieId = firstTrending.id;
        }
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Trending endpoint failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Test 3: Get movie by TMDB ID
    // Use Avengers: Endgame ID if we didn't get one from previous tests
    if (!movieId) {
      movieId = 299534; // Avengers: Endgame ID
    }
    
    console.log(`\nTest 3: Getting movie by TMDB ID (${movieId})...`);
    try {
      const movieResponse = await axios.get(`${MEDIA_ENDPOINT}/tmdb/movie/${movieId}`);
      console.log('\x1b[32m%s\x1b[0m', `✓ TMDB ID endpoint working!`);
      console.log(`  Title: "${movieResponse.data.title}"`);
      console.log(`  Overview: "${movieResponse.data.overview.substring(0, 100)}..."`);
      
      // Save the MongoDB ID for the next test
      const dbId = movieResponse.data._id;
      
      // Test 4: Get movie by MongoDB ID
      console.log(`\nTest 4: Getting movie by MongoDB ID (${dbId})...`);
      try {
        const dbMovieResponse = await axios.get(`${MEDIA_ENDPOINT}/id/${dbId}`);
        console.log('\x1b[32m%s\x1b[0m', `✓ MongoDB ID endpoint working!`);
        console.log(`  Title: "${dbMovieResponse.data.title}"`);
      } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `✗ MongoDB ID endpoint failed: ${error.response?.data?.message || error.message}`);
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `✗ TMDB ID endpoint failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Test 5: Get filtered media
    console.log('\nTest 5: Getting filtered media (movies sorted by popularity)...');
    try {
      const filteredResponse = await axios.get(`${MEDIA_ENDPOINT}`, {
        params: { 
          type: 'movie',
          sort: 'popularity',
          order: 'desc',
          limit: 5
        }
      });
      console.log('\x1b[32m%s\x1b[0m', `✓ Filtered media endpoint working! Found ${filteredResponse.data.results.length} results`);
      
      if (filteredResponse.data.results.length > 0) {
        console.log('  Top 5 popular movies:');
        filteredResponse.data.results.forEach((movie, index) => {
          console.log(`  ${index + 1}. "${movie.title}" (Popularity: ${movie.popularity})`);
        });
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Filtered media endpoint failed: ${error.response?.data?.message || error.message}`);
    }
    
    console.log('\n\x1b[36m%s\x1b[0m', '=== All endpoint tests completed! ===');
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `\n✗ Test failed: ${error.message}`);
  }
}

// Run the tests
runTests(); 