require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Media = require('../models/Media');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  console.error('Please make sure your .env file contains MONGODB_URI');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected for marking new releases'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Mark existing media as new releases
 * This will update a specified number of media items to have newRelease=true
 */
async function markAsNewReleases(count = 10) {
  try {
    console.log(`Starting to mark ${count} media items as new releases...`);
    
    // Get media sorted by release date (newest first)
    const media = await Media.find({})
      .sort({ releaseDate: -1 })
      .limit(count);
    
    if (media.length === 0) {
      console.log('No media found in the database. Please add some media first.');
      return { success: false, message: 'No media found' };
    }
    
    console.log(`Found ${media.length} media items to mark as new releases.`);
    
    // Update each media item
    for (const item of media) {
      await Media.findByIdAndUpdate(item._id, { newRelease: true });
      console.log(`Marked ${item.title} as a new release.`);
    }
    
    console.log(`\nCompleted! Marked ${media.length} media items as new releases.`);
    
    return { success: true, count: media.length };
  } catch (error) {
    console.error('Error marking new releases:', error);
    return { success: false, error: error.message };
  } finally {
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  // Get count from command line arguments or use default
  const count = process.argv[2] ? parseInt(process.argv[2]) : 10;
  
  markAsNewReleases(count)
    .then(result => {
      console.log('Mark as new releases completed with result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Mark as new releases failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other files
  module.exports = markAsNewReleases;
} 