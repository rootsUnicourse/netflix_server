require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('./models/Media');
const tmdbService = require('./services/tmdbService');

async function updateTVShowEpisodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all TV shows from the database
    const tvShows = await Media.find({ type: 'tv' });
    console.log(`Found ${tvShows.length} TV shows in the database`);

    // Process each TV show
    for (const show of tvShows) {
      try {
        console.log(`Processing show: ${show.title} (TMDB ID: ${show.tmdbId})`);
        
        // Always fetch season data to ensure we have the latest episode information
        console.log(`Fetching season data for ${show.title}...`);
        const seasonsData = await tmdbService.fetchAllTVShowSeasons(show.tmdbId, show.seasons);
        
        // Update the media with season data
        await Media.findByIdAndUpdate(show._id, { seasonData: seasonsData });
        console.log(`Updated season data for ${show.title}`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error updating show ${show.title}:`, error.message);
        // Continue with next show even if one fails
      }
    }

    console.log('Finished updating TV show episodes');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateTVShowEpisodes(); 