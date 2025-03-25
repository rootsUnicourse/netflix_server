require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('../models/Media');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function checkActionTVShows() {
  try {
    console.log('Checking for Action TV shows in the database...');
    
    // Find TV shows with Action genre
    const actionTVShows = await Media.find({
      type: 'tv',
      genres: { $in: ['Action & Adventure', 'Action'] }
    });
    
    console.log(`Found ${actionTVShows.length} Action TV shows in the database`);
    
    if (actionTVShows.length > 0) {
      console.log('Sample of Action TV shows:');
      actionTVShows.slice(0, 10).forEach(show => {
        console.log(`- ${show.title} (ID: ${show.tmdbId}, Genres: ${show.genres.join(', ')})`);
      });
    }
  } catch (error) {
    console.error('Error checking Action TV shows:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Execute the function
checkActionTVShows(); 