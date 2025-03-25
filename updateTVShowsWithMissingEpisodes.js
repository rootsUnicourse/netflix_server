require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('./models/Media');
const tmdbService = require('./services/tmdbService');

async function updateTVShowsWithMissingEpisodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find TV shows with missing or incomplete season data
    const tvShows = await Media.find({ 
      type: 'tv',
      $or: [
        { seasonData: { $exists: false } },
        { seasonData: { $size: 0 } },
        // Shows where seasonData exists but has fewer seasons than expected
        {
          $expr: {
            $lt: [{ $size: "$seasonData" }, "$seasons"]
          }
        }
      ]
    });

    console.log(`Found ${tvShows.length} TV shows with missing or incomplete season data`);

    if (tvShows.length === 0) {
      console.log('No TV shows need updating. All TV shows have complete season data.');
      process.exit(0);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each TV show
    for (let i = 0; i < tvShows.length; i++) {
      const show = tvShows[i];
      try {
        console.log(`[${i + 1}/${tvShows.length}] Processing show: ${show.title} (TMDB ID: ${show.tmdbId})`);
        
        // Verify the number of seasons
        console.log(`Show has ${show.seasons} seasons according to database. Attempting to fetch all season data...`);
        
        // Fetch all seasons data
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
    console.log(`Total TV shows needing updates: ${tvShows.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed to update: ${errorCount}`);
    console.log('=========================================\n');
    
    console.log('Finished updating TV shows with missing episodes');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the update function
console.log('Starting Update for TV Shows with Missing Episodes...');
updateTVShowsWithMissingEpisodes(); 