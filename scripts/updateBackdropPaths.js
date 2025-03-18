require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('../models/Media');
const tmdbService = require('../services/tmdbService');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function updateBackdropPaths() {
  try {
    // Find all media without backdrop paths
    const mediaWithoutBackdrops = await Media.find({ 
      $or: [
        { backdropPath: { $exists: false } },
        { backdropPath: null },
        { backdropPath: "" }
      ]
    });
    
    console.log(`Found ${mediaWithoutBackdrops.length} media items without backdrop paths`);
    
    if (mediaWithoutBackdrops.length === 0) {
      console.log('No media items need backdropPath updates');
      return;
    }
    
    let updatedCount = 0;
    
    for (const media of mediaWithoutBackdrops) {
      try {
        if (!media.tmdbId) {
          console.log(`Media ${media.title} has no tmdbId, skipping`);
          continue;
        }
        
        // Get updated media data from TMDB
        const tmdbData = await tmdbService.getMediaDetails(media.type, media.tmdbId);
        
        if (tmdbData && tmdbData.backdrop_path) {
          // Update the media with the backdrop path
          media.backdropPath = `https://image.tmdb.org/t/p/w500${tmdbData.backdrop_path}`;
          await media.save();
          updatedCount++;
          console.log(`Updated backdropPath for ${media.title}`);
        } else {
          console.log(`No backdrop available for ${media.title}`);
        }
      } catch (error) {
        console.error(`Error updating ${media.title}:`, error.message);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} out of ${mediaWithoutBackdrops.length} media items`);
  } catch (error) {
    console.error('Error in updateBackdropPaths:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
updateBackdropPaths(); 