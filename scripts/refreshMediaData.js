require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Media = require('../models/Media');
const tmdbService = require('../services/tmdbService');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  console.error('Please make sure your .env file contains MONGODB_URI');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected for media refresh'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Refresh all media data from TMDB
 * This will update all media entries with the latest data from TMDB
 * including the new fields: director, creators, contentTags, maturityRating, additionalImages
 */
async function refreshAllMedia() {
  try {
    console.log('Starting media refresh process...');
    
    // Get all media from database
    const allMedia = await Media.find({});
    console.log(`Found ${allMedia.length} media items to refresh`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each media item
    for (const media of allMedia) {
      try {
        console.log(`Refreshing ${media.type}: ${media.title} (TMDB ID: ${media.tmdbId})`);
        
        // Fetch fresh data from TMDB
        let tmdbData;
        if (media.type === 'movie') {
          tmdbData = await tmdbService.getMovieDetails(media.tmdbId);
          
          // Transform to our model format
          const updatedData = tmdbService.transformMovieData(tmdbData);
          
          // Update in database
          await Media.findByIdAndUpdate(media._id, updatedData);
        } else if (media.type === 'tv') {
          tmdbData = await tmdbService.getTVShowDetails(media.tmdbId);
          
          // Transform to our model format
          const updatedData = tmdbService.transformTVData(tmdbData);
          
          // Update in database
          await Media.findByIdAndUpdate(media._id, updatedData);
        }
        
        successCount++;
        console.log(`Successfully refreshed ${media.title}`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        errorCount++;
        console.error(`Error refreshing ${media.title}:`, error.message);
      }
    }
    
    console.log('\nRefresh process completed:');
    console.log(`- Successfully refreshed: ${successCount} items`);
    console.log(`- Failed to refresh: ${errorCount} items`);
    
    return { success: true, refreshed: successCount, failed: errorCount };
  } catch (error) {
    console.error('Error in refresh process:', error);
    return { success: false, error: error.message };
  } finally {
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the refresh function if this script is executed directly
if (require.main === module) {
  refreshAllMedia()
    .then(result => {
      console.log('Refresh completed with result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Refresh failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other files
  module.exports = refreshAllMedia;
} 