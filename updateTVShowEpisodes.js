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

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each TV show
    for (let i = 0; i < tvShows.length; i++) {
      const show = tvShows[i];
      try {
        console.log(`[${i + 1}/${tvShows.length}] Processing show: ${show.title} (TMDB ID: ${show.tmdbId})`);
        
        // If the show already has valid seasonData, confirm if we should update
        if (show.seasonData && show.seasonData.length > 0) {
          // Check if all expected seasons are present
          if (show.seasonData.length >= show.seasons) {
            const missingEpisodes = show.seasonData.some(season => 
              !season.episodes || season.episodes.length === 0
            );
            
            if (!missingEpisodes) {
              console.log(`Season data already exists for ${show.title}. Skipping...`);
              skippedCount++;
              continue;
            }
          }
          console.log(`Season data exists for ${show.title} but may be incomplete. Updating...`);
        }
        
        // Always fetch season data to ensure we have the latest episode information
        console.log(`Fetching season data for ${show.title}...`);
        const seasonsData = await tmdbService.fetchAllTVShowSeasons(show.tmdbId, show.seasons);
        
        // Make sure we got valid season data
        if (!seasonsData || !Array.isArray(seasonsData) || seasonsData.length === 0) {
          console.error(`Failed to get valid season data for ${show.title}`);
          errorCount++;
          continue;
        }
        
        // Update the media with season data
        await Media.findByIdAndUpdate(show._id, { seasonData: seasonsData });
        console.log(`Updated season data for ${show.title}. Found ${seasonsData.length} seasons with episodes.`);
        successCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error updating show ${show.title}:`, error.message);
        errorCount++;
        // Continue with next show even if one fails
      }
    }

    console.log('\n===== TV SHOW EPISODE UPDATE SUMMARY =====');
    console.log(`Total TV shows: ${tvShows.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Skipped (already had data): ${skippedCount}`);
    console.log(`Failed to update: ${errorCount}`);
    console.log('=========================================\n');
    
    console.log('Finished updating TV show episodes');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the update function
console.log('Starting TV Show Episodes Update Script...');
updateTVShowEpisodes(); 