require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('../models/Media');
const tmdbService = require('../services/tmdbService');

async function verifyAndFixTVShows() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all TV shows from the database
    const tvShows = await Media.find({ type: 'tv' });
    console.log(`Found ${tvShows.length} TV shows in the database`);

    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each TV show
    for (let i = 0; i < tvShows.length; i++) {
      const show = tvShows[i];
      try {
        console.log(`\n[${i + 1}/${tvShows.length}] Verifying: ${show.title} (TMDB ID: ${show.tmdbId})`);
        
        // 1. Verify the TMDB ID and get complete TV show details
        let tmdbDetails;
        try {
          console.log(`Fetching latest details for ${show.title}...`);
          tmdbDetails = await tmdbService.getTVShowDetails(show.tmdbId);
          
          // Verify the tmdbId is valid by checking basic fields
          if (!tmdbDetails || !tmdbDetails.name) {
            throw new Error('Invalid TMDB response');
          }
        } catch (tmdbError) {
          console.error(`Error fetching TMDB details for ${show.title}: ${tmdbError.message}`);
          errorCount++;
          continue;
        }
        
        // 2. Check if the number of seasons is correct
        const currentSeasons = show.seasons || 0;
        const tmdbSeasons = tmdbDetails.number_of_seasons || 0;
        
        // 3. Update TV show metadata if necessary
        let needsUpdate = false;
        const updateData = {};
        
        if (currentSeasons !== tmdbSeasons) {
          console.log(`Season count mismatch: DB has ${currentSeasons}, TMDB has ${tmdbSeasons}`);
          updateData.seasons = tmdbSeasons;
          needsUpdate = true;
        }
        
        // Check for other outdated information
        if (show.title !== tmdbDetails.name) {
          console.log(`Title mismatch: DB has "${show.title}", TMDB has "${tmdbDetails.name}"`);
          updateData.title = tmdbDetails.name;
          needsUpdate = true;
        }
        
        if (tmdbDetails.overview && show.overview !== tmdbDetails.overview) {
          console.log('Overview needs updating');
          updateData.overview = tmdbDetails.overview;
          needsUpdate = true;
        }
        
        // 4. Update basic metadata if needed
        if (needsUpdate) {
          console.log(`Updating basic metadata for ${show.title}...`);
          await Media.findByIdAndUpdate(show._id, updateData);
          console.log('Basic metadata updated');
        }
        
        // 5. Check if seasonData needs to be updated
        let needsSeasonUpdate = false;
        
        // If seasons count changed or we have missing/incomplete season data
        if (
          currentSeasons !== tmdbSeasons || 
          !show.seasonData || 
          show.seasonData.length === 0 ||
          show.seasonData.length < tmdbSeasons
        ) {
          needsSeasonUpdate = true;
        } else {
          // Check if any season has missing episodes
          needsSeasonUpdate = show.seasonData.some(season => 
            !season.episodes || season.episodes.length === 0
          );
        }
        
        if (!needsUpdate && !needsSeasonUpdate) {
          console.log(`No updates needed for ${show.title}`);
          skippedCount++;
          continue;
        }
        
        // 6. Update season data if needed
        if (needsSeasonUpdate) {
          try {
            console.log(`Fetching all season data for ${show.title}...`);
            const seasonsData = await tmdbService.fetchAllTVShowSeasons(show.tmdbId, tmdbSeasons);
            
            if (!seasonsData || !Array.isArray(seasonsData) || seasonsData.length === 0) {
              throw new Error('Failed to fetch valid season data');
            }
            
            console.log(`Updating season data for ${show.title}. Found ${seasonsData.length} seasons with episodes`);
            await Media.findByIdAndUpdate(show._id, { seasonData: seasonsData });
          } catch (seasonError) {
            console.error(`Error updating season data for ${show.title}: ${seasonError.message}`);
            errorCount++;
            continue;
          }
        }
        
        console.log(`Successfully updated ${show.title}`);
        updatedCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error processing ${show.title}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n===== TV SHOW VERIFICATION SUMMARY =====');
    console.log(`Total TV shows: ${tvShows.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (no updates needed): ${skippedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log('=========================================\n');
    
    console.log('Finished verifying and fixing TV shows');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the verification function
console.log('Starting TV Show Verification and Fix...');
verifyAndFixTVShows(); 