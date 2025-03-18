require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('../models/Media');
const { fetchFromTMDB } = require('../services/tmdbService');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// List of specific TMDB IDs we want to ensure are in the database
const specificTmdbIds = [
  11544,  // One Piece
  425,    // Ice Age
  10681,  // Dragonball Z
  635302, // Demon Slayer: Kimetsu no Yaiba the Movie: Mugen Train
  808,    // Shrek
  809,    // Shrek 2
  82702,  // Solo Leveling
  519182, // My Hero Academia
  1357633, // Blue Lock
  1104845, // Jujutsu Kaisen
];

const fetchSpecificAnimationMedia = async () => {
  try {
    console.log('Fetching specific animation media...');
    
    for (const tmdbId of specificTmdbIds) {
      // Check if media already exists in database
      const existingMedia = await Media.findOne({ tmdbId });
      
      if (existingMedia) {
        console.log(`Media with TMDB ID ${tmdbId} already exists in database: ${existingMedia.title || existingMedia.name}`);
        continue;
      }
      
      // Try as movie first
      try {
        const movieResponse = await fetchFromTMDB(`/movie/${tmdbId}`);
        
        if (movieResponse && movieResponse.id) {
          const movieData = {
            title: movieResponse.title,
            overview: movieResponse.overview,
            posterPath: movieResponse.poster_path,
            backdropPath: movieResponse.backdrop_path,
            releaseDate: movieResponse.release_date,
            type: 'movie',
            tmdbId: movieResponse.id.toString(),
            genres: movieResponse.genres?.map(g => g.name) || [],
            popularity: movieResponse.popularity,
            voteAverage: movieResponse.vote_average,
            voteCount: movieResponse.vote_count,
            originalLanguage: movieResponse.original_language,
            adult: movieResponse.adult,
            status: movieResponse.status,
          };
          
          const newMovie = new Media(movieData);
          await newMovie.save();
          console.log(`Added movie: ${movieData.title} (TMDB ID: ${tmdbId})`);
          continue;
        }
      } catch (error) {
        console.log(`${tmdbId} not found as movie, trying as TV show...`);
      }
      
      // Try as TV show
      try {
        const tvResponse = await fetchFromTMDB(`/tv/${tmdbId}`);
        
        if (tvResponse && tvResponse.id) {
          const tvData = {
            name: tvResponse.name,
            overview: tvResponse.overview,
            posterPath: tvResponse.poster_path,
            backdropPath: tvResponse.backdrop_path,
            firstAirDate: tvResponse.first_air_date,
            type: 'tv',
            tmdbId: tvResponse.id.toString(),
            genres: tvResponse.genres?.map(g => g.name) || [],
            popularity: tvResponse.popularity,
            voteAverage: tvResponse.vote_average,
            voteCount: tvResponse.vote_count,
            originalLanguage: tvResponse.original_language,
            status: tvResponse.status,
            numberOfSeasons: tvResponse.number_of_seasons,
            numberOfEpisodes: tvResponse.number_of_episodes,
          };
          
          const newTVShow = new Media(tvData);
          await newTVShow.save();
          console.log(`Added TV show: ${tvData.name} (TMDB ID: ${tmdbId})`);
          continue;
        }
      } catch (error) {
        console.error(`Error fetching TV show with TMDB ID ${tmdbId}:`, error.message);
      }
      
      console.warn(`Could not find media with TMDB ID ${tmdbId} as either movie or TV show`);
    }
    
    console.log('Finished fetching specific animation media');
  } catch (error) {
    console.error('Error in fetchSpecificAnimationMedia:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

fetchSpecificAnimationMedia();