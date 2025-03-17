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
  .then(() => console.log('MongoDB connected for adding new releases'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Add new releases to the database
 * This will fetch recent movies and TV shows from TMDB and mark them as new releases
 */
async function addNewReleases() {
  try {
    console.log('Starting to add new releases...');
    
    // Get current date and date 90 days ago
    const currentDate = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // Fetch popular movies from TMDB
    console.log('Fetching popular movies...');
    const popularMovies = await tmdbService.getPopular('movie');
    
    // Fetch popular TV shows from TMDB
    console.log('Fetching popular TV shows...');
    const popularTVShows = await tmdbService.getPopular('tv');
    
    let addedCount = 0;
    
    // Process movies
    console.log('Processing movies...');
    for (const movie of popularMovies.results.slice(0, 15)) {
      try {
        // Check if movie already exists in our database
        let media = await Media.findOne({ tmdbId: movie.id, type: 'movie' });
        
        if (!media) {
          // Fetch and store movie
          const tmdbMovie = await tmdbService.getMovieDetails(movie.id);
          const movieData = tmdbService.transformMovieData(tmdbMovie);
          
          // Force set newRelease to true
          movieData.newRelease = true;
          
          // Create new media entry
          media = await Media.create(movieData);
          addedCount++;
          console.log(`Added movie: ${movieData.title}`);
        } else {
          // Update existing media to be a new release
          await Media.findByIdAndUpdate(media._id, { newRelease: true });
          addedCount++;
          console.log(`Updated movie: ${media.title} to be a new release`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        console.error(`Error processing movie ${movie.id}:`, error.message);
      }
    }
    
    // Process TV shows
    console.log('Processing TV shows...');
    for (const tvShow of popularTVShows.results.slice(0, 15)) {
      try {
        // Check if TV show already exists in our database
        let media = await Media.findOne({ tmdbId: tvShow.id, type: 'tv' });
        
        if (!media) {
          // Fetch and store TV show
          const tmdbTV = await tmdbService.getTVShowDetails(tvShow.id);
          const tvData = tmdbService.transformTVData(tmdbTV);
          
          // Force set newRelease to true
          tvData.newRelease = true;
          
          // Create new media entry
          media = await Media.create(tvData);
          addedCount++;
          console.log(`Added TV show: ${tvData.title}`);
        } else {
          // Update existing media to be a new release
          await Media.findByIdAndUpdate(media._id, { newRelease: true });
          addedCount++;
          console.log(`Updated TV show: ${media.title} to be a new release`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        console.error(`Error processing TV show ${tvShow.id}:`, error.message);
      }
    }
    
    console.log(`\nCompleted! Added or updated ${addedCount} media items as new releases.`);
    
    return { success: true, count: addedCount };
  } catch (error) {
    console.error('Error adding new releases:', error);
    return { success: false, error: error.message };
  } finally {
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  addNewReleases()
    .then(result => {
      console.log('Add new releases completed with result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Add new releases failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other files
  module.exports = addNewReleases;
} 