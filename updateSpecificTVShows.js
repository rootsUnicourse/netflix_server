require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('./models/Media');
const tmdbService = require('./services/tmdbService');

// List of TV shows to update
const TV_SHOWS_TO_UPDATE = [
  'Severance',
  'Adolescence',
  'Reacher',
  'The White Lotus',
  'Daredevil: Born Again',
  'The Residence',
  '1923',
  'When Life Gives You Tangerines',
  'Good American Family'
];

// Known TMDB IDs for some of these shows (in case title search fails)
const TMDB_IDS = {
  'Severance': 95396,
  'Reacher': 108978,
  'The White Lotus': 119051,
  'Daredevil: Born Again': 215103,
  '1923': 153464
};

async function updateSpecificTVShows() {
  try {
    console.log('Starting update for specific TV shows...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Keep track of newly added shows
    let newlyAddedShows = [];
    
    // Find all the specified TV shows (using case-insensitive search)
    let tvShows = await Media.find({
      type: 'tv',
      title: { $in: TV_SHOWS_TO_UPDATE.map(title => new RegExp('^' + title + '$', 'i')) }
    });
    
    console.log(`Found ${tvShows.length} out of ${TV_SHOWS_TO_UPDATE.length} TV shows by title in the database`);
    
    // Find which shows were not found by title
    const foundTitles = tvShows.map(show => show.title.toLowerCase());
    let notFoundTitles = TV_SHOWS_TO_UPDATE.filter(title => 
      !foundTitles.some(foundTitle => foundTitle.toLowerCase() === title.toLowerCase())
    );
    
    // Try to find by TMDB ID for shows that weren't found by title
    if (notFoundTitles.length > 0) {
      console.log('Trying to find shows by TMDB ID:', notFoundTitles.join(', '));
      
      // Collect TMDB IDs for shows not found by title
      const tmdbIds = notFoundTitles
        .filter(title => TMDB_IDS[title])
        .map(title => TMDB_IDS[title]);
      
      if (tmdbIds.length > 0) {
        const additionalShows = await Media.find({
          type: 'tv',
          tmdbId: { $in: tmdbIds }
        });
        
        console.log(`Found ${additionalShows.length} additional shows by TMDB ID`);
        
        // Add these shows to our list
        tvShows = [...tvShows, ...additionalShows];
        
        // Update not found titles list
        const foundByTmdbId = additionalShows.map(show => {
          // Find the title based on the TMDB ID
          const title = Object.keys(TMDB_IDS).find(key => TMDB_IDS[key] === show.tmdbId);
          return title;
        });
        
        notFoundTitles = notFoundTitles.filter(title => !foundByTmdbId.includes(title));
      }
    }
    
    // Search TMDB for shows that weren't found in our database
    if (notFoundTitles.length > 0) {
      console.log('Searching TMDB for shows not found in our database:', notFoundTitles.join(', '));
      
      for (const title of notFoundTitles) {
        try {
          console.log(`Searching TMDB for "${title}"...`);
          
          // First check if we have a known TMDB ID
          if (TMDB_IDS[title]) {
            console.log(`Using known TMDB ID for ${title}: ${TMDB_IDS[title]}`);
            try {
              // Try to fetch and store the TV show using the known TMDB ID
              const tvShow = await tmdbService.fetchAndStoreTV(TMDB_IDS[title]);
              console.log(`Added "${tvShow.title}" (TMDB ID: ${tvShow.tmdbId}) to the database`);
              newlyAddedShows.push(tvShow);
              continue; // Skip to the next title
            } catch (error) {
              console.error(`Failed to fetch TV show with TMDB ID ${TMDB_IDS[title]}:`, error.message);
              // Continue to search by title
            }
          }
          
          // Search by title
          const searchResults = await tmdbService.searchMedia(title);
          
          // Find the first TV show result that closely matches our title
          const tvResult = searchResults.results.find(item => 
            item.media_type === 'tv' && 
            item.name && 
            item.name.toLowerCase().includes(title.toLowerCase())
          );
          
          if (tvResult) {
            console.log(`Found "${tvResult.name}" (TMDB ID: ${tvResult.id}) - adding to database`);
            
            // Fetch full details and add to our database
            const tvShow = await tmdbService.fetchAndStoreTV(tvResult.id);
            console.log(`Added "${tvShow.title}" (TMDB ID: ${tvShow.tmdbId}) to the database`);
            
            newlyAddedShows.push(tvShow);
          } else {
            console.log(`No matching TV show found for "${title}" in TMDB`);
          }
        } catch (error) {
          console.error(`Error searching for "${title}":`, error.message);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Add newly added shows to our list for processing
      if (newlyAddedShows.length > 0) {
        console.log(`Added ${newlyAddedShows.length} new shows to the database`);
        tvShows = [...tvShows, ...newlyAddedShows];
        
        // Update not found titles
        const newlyAddedTitles = newlyAddedShows.map(show => show.title);
        notFoundTitles = notFoundTitles.filter(title => 
          !newlyAddedTitles.some(newTitle => 
            newTitle.toLowerCase().includes(title.toLowerCase()) || 
            title.toLowerCase().includes(newTitle.toLowerCase())
          )
        );
      }
    }
    
    // Final list of shows not found
    if (notFoundTitles.length > 0) {
      console.log('The following shows were not found in the database or TMDB:', notFoundTitles.join(', '));
    }
    
    // Update each TV show
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < tvShows.length; i++) {
      const show = tvShows[i];
      console.log(`[${i+1}/${tvShows.length}] Processing show: ${show.title} (TMDB ID: ${show.tmdbId})`);
      
      try {
        // Fetch all season data for this TV show
        console.log(`Fetching season data for ${show.title}...`);
        const seasonData = await tmdbService.fetchAllTVShowSeasons(show.tmdbId);
        
        // Update the show with season data
        await Media.findByIdAndUpdate(show._id, { seasonData });
        
        console.log(`Updated season data for ${show.title}. Found ${seasonData.length} seasons with episodes.`);
        successCount++;
      } catch (error) {
        console.error(`Error updating ${show.title}:`, error.message);
        errorCount++;
      }
      
      // Add a small delay to avoid rate limiting
      if (i < tvShows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n===== TV SHOW UPDATE SUMMARY =====');
    console.log(`Total TV shows searched for: ${TV_SHOWS_TO_UPDATE.length}`);
    console.log(`Found in database initially: ${tvShows.length - newlyAddedShows.length}`);
    console.log(`Added from TMDB: ${newlyAddedShows.length}`);
    console.log(`Not found in database or TMDB: ${notFoundTitles.length}`);
    console.log(`Successfully updated with season data: ${successCount}`);
    console.log(`Failed to update: ${errorCount}`);
    console.log('===================================\n');
    
    console.log('Finished updating specific TV shows');
  } catch (error) {
    console.error('Error in updateSpecificTVShows:', error.message);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Execute the function
updateSpecificTVShows(); 