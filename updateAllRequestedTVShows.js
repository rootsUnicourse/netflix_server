require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('./models/Media');
const tmdbService = require('./services/tmdbService');

// List of all requested TV shows with their correct TMDB IDs
const TV_SHOWS = [
  { title: 'Severance', tmdbId: 95396 },
  { title: 'Adolescence', tmdbId: 249042 },
  { title: 'Reacher', tmdbId: 108978 },
  { title: 'The White Lotus', tmdbId: 111803 },
  { title: 'Daredevil: Born Again', tmdbId: 202555 },
  { title: 'The Residence', tmdbId: 242054 },
  { title: '1923', tmdbId: 157744 },
  { title: 'When Life Gives You Tangerines', tmdbId: 219246 },
  { title: 'Good American Family', tmdbId: 207411 }
];

async function updateAllRequestedTVShows() {
  try {
    console.log('Starting update for all requested TV shows with their correct TMDB IDs...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Process each TV show
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < TV_SHOWS.length; i++) {
      const { title, tmdbId } = TV_SHOWS[i];
      console.log(`[${i+1}/${TV_SHOWS.length}] Processing show: ${title} (TMDB ID: ${tmdbId})`);
      
      try {
        // Check if show already exists with this TMDB ID
        let tvShow = await Media.findOne({ tmdbId, type: 'tv' });
        
        if (!tvShow) {
          console.log(`Show not found in database. Adding "${title}" (TMDB ID: ${tmdbId})...`);
          
          // Fetch and add the show
          tvShow = await tmdbService.fetchAndStoreTV(tmdbId);
          console.log(`Added "${tvShow.title}" (TMDB ID: ${tvShow.tmdbId}) to the database`);
          addedCount++;
        }
        
        // Check if the show has season data
        if (!tvShow.seasonData || tvShow.seasonData.length === 0) {
          console.log(`Fetching season data for ${tvShow.title}...`);
          
          // Fetch all season data for this TV show
          const seasonData = await tmdbService.fetchAllTVShowSeasons(tmdbId);
          
          // Update the show with season data
          await Media.findByIdAndUpdate(tvShow._id, { seasonData });
          
          console.log(`Updated season data for ${tvShow.title}. Found ${seasonData.length} seasons with episodes.`);
          updatedCount++;
        } else {
          console.log(`${tvShow.title} already has season data (${tvShow.seasonData.length} seasons). Skipping.`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error processing ${title}:`, error.message);
        errorCount++;
      }
      
      // Add a small delay to avoid rate limiting
      if (i < TV_SHOWS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n===== TV SHOW UPDATE SUMMARY =====');
    console.log(`Total TV shows processed: ${TV_SHOWS.length}`);
    console.log(`Added to database: ${addedCount}`);
    console.log(`Updated with season data: ${updatedCount}`);
    console.log(`Skipped (already had season data): ${skippedCount}`);
    console.log(`Failed to process: ${errorCount}`);
    console.log('===================================\n');
    
    console.log('Finished updating all requested TV shows');
  } catch (error) {
    console.error('Error in updateAllRequestedTVShows:', error.message);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Execute the function
updateAllRequestedTVShows(); 