require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('./models/Media');
const tmdbService = require('./services/tmdbService');

// Sample TMDB IDs of popular shows in Israel
// These are just examples - replace with actual popular shows in Israel
const POPULAR_SHOWS_IN_ISRAEL = [
  1396,  // Breaking Bad
  66732, // Stranger Things
  1399,  // Game of Thrones
  71446, // Money Heist
  76479, // The Boys
  60735, // The Flash
  1402,  // The Walking Dead
  60574, // Peaky Blinders
  84958, // Loki
  63174  // Lucifer
];

async function markPopularShowsInIsrael() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Reset all shows first
    await Media.updateMany(
      { popularInIsrael: true },
      { $set: { popularInIsrael: false } }
    );
    console.log('Reset all shows to not popular in Israel');

    // Process each show
    for (const tmdbId of POPULAR_SHOWS_IN_ISRAEL) {
      // Check if the show exists in our database
      let show = await Media.findOne({ tmdbId, type: 'tv' });
      
      // If not, fetch and store it
      if (!show) {
        try {
          show = await tmdbService.fetchAndStoreTV(tmdbId);
          console.log(`Added new show: ${show.title}`);
        } catch (error) {
          console.error(`Failed to fetch show with TMDB ID ${tmdbId}:`, error.message);
          continue;
        }
      }
      
      // Mark as popular in Israel
      await Media.findByIdAndUpdate(show._id, { popularInIsrael: true });
      console.log(`Marked "${show.title}" as popular in Israel`);
    }

    console.log('Finished marking popular shows in Israel');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

markPopularShowsInIsrael(); 