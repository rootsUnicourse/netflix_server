require('dotenv').config();
const axios = require('axios');

const searchTerm = process.argv[2];

if (!searchTerm) {
  console.error('Please provide a search term as an argument');
  process.exit(1);
}

const bearerToken = process.env.TMDB_API_KEY;

async function searchShow() {
  try {
    console.log(`Searching for TV show: "${searchTerm}"...`);
    const response = await axios.get(`https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(searchTerm)}`, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.results.length === 0) {
      console.log('No results found');
      return;
    }
    
    console.log(`Found ${response.data.results.length} results:`);
    
    response.data.results.slice(0, 5).forEach((show, index) => {
      console.log(`[${index + 1}] ${show.name} (ID: ${show.id}) - ${show.first_air_date || 'No air date'}`);
      console.log(`    Overview: ${show.overview || 'No overview available'}`);
      console.log();
    });
  } catch (error) {
    console.error('Error searching for show:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

searchShow(); 