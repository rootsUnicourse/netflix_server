const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Helper function to get full image URL
const getTMDBImageUrl = (path) => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/original${path}`;
};

// Get popular media (movies and TV shows)
exports.getPopularMedia = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    
    // Fetch popular movies
    const moviesResponse = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1
      }
    });

    // Fetch popular TV shows
    const tvShowsResponse = await axios.get(`${TMDB_BASE_URL}/tv/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1
      }
    });

    // Combine and format the results
    const movies = moviesResponse.data.results.map(movie => ({
      id: movie.id,
      tmdbId: movie.id,
      title: movie.title,
      type: 'movie',
      posterPath: getTMDBImageUrl(movie.poster_path),
      backdropPath: getTMDBImageUrl(movie.backdrop_path),
      overview: movie.overview,
      releaseDate: movie.release_date,
      voteAverage: movie.vote_average,
      genres: movie.genre_ids // We'll fetch genre names if needed
    }));

    const tvShows = tvShowsResponse.data.results.map(show => ({
      id: show.id,
      tmdbId: show.id,
      title: show.name,
      type: 'tv',
      posterPath: getTMDBImageUrl(show.poster_path),
      backdropPath: getTMDBImageUrl(show.backdrop_path),
      overview: show.overview,
      releaseDate: show.first_air_date,
      voteAverage: show.vote_average,
      genres: show.genre_ids // We'll fetch genre names if needed
    }));

    // Combine and sort by popularity
    const allMedia = [...movies, ...tvShows]
      .sort((a, b) => b.voteAverage - a.voteAverage)
      .slice(0, limit);

    res.json(allMedia);
  } catch (error) {
    console.error('Error fetching popular media:', error);
    res.status(500).json({ message: 'Error fetching popular media' });
  }
};

// Get media details from TMDB
exports.getMediaDetails = async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.params;
    
    if (!tmdbId || !mediaType || (mediaType !== 'movie' && mediaType !== 'tv')) {
      return res.status(400).json({ message: 'Invalid parameters. Required: tmdbId and mediaType (movie or tv)' });
    }
    
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key is missing' });
    }

    // Fetch basic details
    const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=en-US&append_to_response=credits,images,videos`;
    const detailsResponse = await axios.get(detailsUrl);
    
    // Fetch keywords (different endpoints for movies and TV shows)
    const keywordsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/keywords?api_key=${apiKey}`;
    const keywordsResponse = await axios.get(keywordsUrl);
    
    // Get keywords based on media type
    const keywords = mediaType === 'movie' 
      ? keywordsResponse.data.keywords?.map(k => k.name) || []
      : keywordsResponse.data.results?.map(k => k.name) || [];
      
    // Get content ratings/certifications
    let maturityRating = 'NR';
    try {
      if (mediaType === 'movie') {
        const releaseDatesUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${apiKey}`;
        const releaseDatesResponse = await axios.get(releaseDatesUrl);
        const usReleases = releaseDatesResponse.data.results.find(r => r.iso_3166_1 === 'US');
        if (usReleases && usReleases.release_dates && usReleases.release_dates.length > 0) {
          maturityRating = usReleases.release_dates[0].certification || 'NR';
        }
      } else {
        const contentRatingsUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/content_ratings?api_key=${apiKey}`;
        const contentRatingsResponse = await axios.get(contentRatingsUrl);
        const usRating = contentRatingsResponse.data.results.find(r => r.iso_3166_1 === 'US');
        if (usRating) {
          maturityRating = usRating.rating || 'NR';
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error.message);
      // Continue with default 'NR' rating
    }
    
    // Get additional images
    let additionalImages = [];
    try {
      // First, try to get images from different collections
      const collectionsToTry = ['backdrops', 'posters'];
      let imagesData = null;
      
      // Check if we already have images data from the details response
      if (detailsResponse.data.images && 
         (detailsResponse.data.images.backdrops?.length > 0 || 
          detailsResponse.data.images.posters?.length > 0)) {
        imagesData = detailsResponse.data.images;
      } else {
        // Fetch images separately
        const imagesUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/images?api_key=${apiKey}`;
        const imagesResponse = await axios.get(imagesUrl);
        imagesData = imagesResponse.data;
      }
      
      // Create a diverse set of images by taking from both backdrops and posters
      if (imagesData) {
        // Add backdrops (but not the main backdrop)
        const mainBackdropPath = detailsResponse.data.backdrop_path;
        if (imagesData.backdrops && imagesData.backdrops.length > 0) {
          // Filter out the main backdrop to avoid duplication
          const uniqueBackdrops = imagesData.backdrops
            .filter(img => img.file_path !== mainBackdropPath)
            .slice(0, 3); // Get up to 3 different backdrops
            
          additionalImages = [
            ...additionalImages,
            ...uniqueBackdrops.map(img => `https://image.tmdb.org/t/p/w500${img.file_path}`)
          ];
        }
        
        // Add posters (but not the main poster)
        const mainPosterPath = detailsResponse.data.poster_path;
        if (imagesData.posters && imagesData.posters.length > 0 && additionalImages.length < 4) {
          // Filter out the main poster to avoid duplication
          const uniquePosters = imagesData.posters
            .filter(img => img.file_path !== mainPosterPath)
            .slice(0, 4 - additionalImages.length); // Fill up to 4 total images
            
          additionalImages = [
            ...additionalImages,
            ...uniquePosters.map(img => `https://image.tmdb.org/t/p/w500${img.file_path}`)
          ];
        }
      }
      
      // If we still need more images, add stills for TV shows
      if (mediaType === 'tv' && additionalImages.length < 4) {
        try {
          const seasonStillsUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/1/images?api_key=${apiKey}`;
          const seasonStillsResponse = await axios.get(seasonStillsUrl);
          
          if (seasonStillsResponse.data && seasonStillsResponse.data.stills) {
            const stills = seasonStillsResponse.data.stills
              .slice(0, 4 - additionalImages.length)
              .map(img => `https://image.tmdb.org/t/p/w500${img.file_path}`);
              
            additionalImages = [...additionalImages, ...stills];
          }
        } catch (error) {
          console.error('Error fetching season stills:', error.message);
        }
      }
      
      // Lastly, if we somehow still don't have enough images, include the main backdrop
      if (additionalImages.length === 0 && detailsResponse.data.backdrop_path) {
        additionalImages = [`https://image.tmdb.org/t/p/w500${detailsResponse.data.backdrop_path}`];
      }
      
      // If we somehow still don't have enough images, include the main poster
      if (additionalImages.length < 3 && detailsResponse.data.poster_path) {
        additionalImages.push(`https://image.tmdb.org/t/p/w500${detailsResponse.data.poster_path}`);
      }
      
    } catch (error) {
      console.error('Error fetching additional images:', error.message);
      // Continue with empty additional images
    }
    
    let result = {
      tmdbId: detailsResponse.data.id,
      title: mediaType === 'movie' ? detailsResponse.data.title : detailsResponse.data.name,
      overview: detailsResponse.data.overview,
      posterPath: detailsResponse.data.poster_path ? `https://image.tmdb.org/t/p/w500${detailsResponse.data.poster_path}` : null,
      backdropPath: detailsResponse.data.backdrop_path ? `https://image.tmdb.org/t/p/original${detailsResponse.data.backdrop_path}` : null,
      releaseDate: mediaType === 'movie' ? detailsResponse.data.release_date : detailsResponse.data.first_air_date,
      type: mediaType,
      voteAverage: detailsResponse.data.vote_average,
      genres: detailsResponse.data.genres.map(genre => genre.name),
      runtime: mediaType === 'movie' ? detailsResponse.data.runtime : (detailsResponse.data.episode_run_time && detailsResponse.data.episode_run_time.length > 0 ? detailsResponse.data.episode_run_time[0] : 30),
      seasons: mediaType === 'tv' ? detailsResponse.data.number_of_seasons : null,
      contentTags: keywords.slice(0, 5),
      cast: detailsResponse.data.credits.cast.slice(0, 15).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        profilePath: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
      })),
      director: mediaType === 'movie' 
        ? detailsResponse.data.credits.crew.find(person => person.job === 'Director')?.name || 'Unknown'
        : null,
      creators: mediaType === 'tv' 
        ? detailsResponse.data.created_by.map(creator => creator.name)
        : null,
      additionalImages: additionalImages,
      maturityRating: maturityRating
    };
    
    // For TV shows, fetch season data
    if (mediaType === 'tv' && detailsResponse.data.number_of_seasons > 0) {
      result.seasonData = [];
      
      // Get first season data to display
      const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/1?api_key=${apiKey}&language=en-US`;
      const seasonResponse = await axios.get(seasonUrl);
      
      result.seasonData.push({
        seasonNumber: 1,
        episodes: seasonResponse.data.episodes.map(episode => ({
          episodeNumber: episode.episode_number,
          name: episode.name,
          overview: episode.overview,
          stillPath: episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : null,
          airDate: episode.air_date,
          runtime: episode.runtime || 30 // Default runtime if not provided
        }))
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getMediaDetails:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get AI-style recommendations from TMDB
exports.getRecommendations = async (req, res) => {
  try {
    const { mediaType = 'all', limit = 10 } = req.query;
    const apiKey = process.env.TMDB_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key is missing' });
    }

    // Validate mediaType
    if (mediaType !== 'all' && mediaType !== 'movie' && mediaType !== 'tv') {
      return res.status(400).json({ 
        message: 'Invalid mediaType. Must be "all", "movie", or "tv"' 
      });
    }

    // Determine which endpoint to use
    let movies = [];
    let tvShows = [];

    if (mediaType === 'movie' || mediaType === 'all') {
      // Get popular/trending movies
      const moviesResponse = await axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
        params: {
          api_key: apiKey,
          language: 'en-US'
        }
      });
      
      movies = moviesResponse.data.results.map(movie => ({
        id: movie.id,
        tmdbId: movie.id,
        title: movie.title,
        type: 'movie',
        overview: movie.overview,
        posterPath: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${movie.poster_path}` : null,
        backdropPath: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${movie.backdrop_path}` : null,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average,
        popularity: movie.popularity,
        genres: movie.genre_ids || [] // We'll keep the genre IDs for now
      }));
    }

    if (mediaType === 'tv' || mediaType === 'all') {
      // Get popular/trending TV shows
      const tvResponse = await axios.get(`${TMDB_BASE_URL}/trending/tv/week`, {
        params: {
          api_key: apiKey,
          language: 'en-US'
        }
      });
      
      tvShows = tvResponse.data.results.map(show => ({
        id: show.id,
        tmdbId: show.id,
        title: show.name,
        type: 'tv',
        overview: show.overview,
        posterPath: show.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${show.poster_path}` : null,
        backdropPath: show.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${show.backdrop_path}` : null,
        releaseDate: show.first_air_date,
        voteAverage: show.vote_average,
        popularity: show.popularity,
        genres: show.genre_ids || [] // We'll keep the genre IDs for now
      }));
    }

    // Combine and sort by popularity
    const allMedia = [...movies, ...tvShows]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, parseInt(limit, 10));

    res.json({
      results: allMedia,
      totalResults: allMedia.length
    });
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    res.status(500).json({ message: 'Error fetching recommendations', error: error.message });
  }
}; 