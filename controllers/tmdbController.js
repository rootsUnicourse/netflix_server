const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Helper function to get full image URL
const getTMDBImageUrl = (path, size = 'original') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

// Helper function to transform TMDB movie data to our format
const transformTMDBMovie = (movie) => {
  return {
    _id: `tmdb-movie-${movie.id}`,
    tmdbId: movie.id,
    title: movie.title,
    type: 'movie',
    overview: movie.overview,
    posterPath: getTMDBImageUrl(movie.poster_path, 'w500'),
    backdropPath: getTMDBImageUrl(movie.backdrop_path, 'original'),
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
    popularity: movie.popularity,
    genres: movie.genres?.map(g => g.name) || [] // Use empty array if genres is undefined
  };
};

// Helper function to transform TMDB TV show data to our format
const transformTMDBShow = (show) => {
  return {
    _id: `tmdb-tv-${show.id}`,
    tmdbId: show.id,
    title: show.name,
    type: 'tv',
    overview: show.overview,
    posterPath: getTMDBImageUrl(show.poster_path, 'w500'),
    backdropPath: getTMDBImageUrl(show.backdrop_path, 'original'),
    releaseDate: show.first_air_date,
    voteAverage: show.vote_average,
    popularity: show.popularity,
    genres: show.genres?.map(g => g.name) || [] // Use empty array if genres is undefined
  };
};

// Helper function to get genre name from TMDB genre ID
const getGenreName = (mediaType, genreId) => {
  // Movie genre IDs
  const movieGenres = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
  };
  
  // TV show genre IDs
  const tvGenres = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    37: 'Western'
  };
  
  // Return the genre name based on media type
  if (mediaType === 'movie') {
    return movieGenres[genreId] || null;
  } else {
    return tvGenres[genreId] || null;
  }
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

// Get top shows in Israel
exports.getTopShowsInIsrael = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const apiKey = process.env.TMDB_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key is missing' });
    }

    // Fetch popular TV shows and movies from Israel
    // We'll use discover API with region=IL parameter
    const moviesResponse = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: apiKey,
        language: 'en-US',
        region: 'IL',
        sort_by: 'popularity.desc',
        include_adult: false,
        page: 1,
        'vote_count.gte': 50 // Ensure some minimum votes to get quality results
      }
    });

    const tvShowsResponse = await axios.get(`${TMDB_BASE_URL}/discover/tv`, {
      params: {
        api_key: apiKey,
        language: 'en-US',
        sort_by: 'popularity.desc',
        include_adult: false,
        page: 1,
        'vote_count.gte': 50, // Ensure some minimum votes
        with_original_language: 'he,en' // Include Hebrew and English language shows
      }
    });

    // Process the movies and TV shows
    const movies = moviesResponse.data.results
      .filter(movie => movie.poster_path && movie.backdrop_path)
      .map(movie => ({
        _id: `tmdb-movie-${movie.id}`,
        tmdbId: movie.id,
        title: movie.title,
        type: 'movie',
        posterPath: getTMDBImageUrl(movie.poster_path),
        backdropPath: getTMDBImageUrl(movie.backdrop_path),
        overview: movie.overview,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average
      }));

    const tvShows = tvShowsResponse.data.results
      .filter(show => show.poster_path && show.backdrop_path)
      .map(show => ({
        _id: `tmdb-tv-${show.id}`,
        tmdbId: show.id,
        title: show.name,
        type: 'tv',
        posterPath: getTMDBImageUrl(show.poster_path),
        backdropPath: getTMDBImageUrl(show.backdrop_path),
        overview: show.overview,
        releaseDate: show.first_air_date,
        voteAverage: show.vote_average
      }));

    // Combine and get the top items
    const topShows = [...movies, ...tvShows]
      .sort((a, b) => b.voteAverage - a.voteAverage)
      .slice(0, limit);

    // If we don't have enough shows, fetch more using trending
    if (topShows.length < limit) {
      const trendingResponse = await axios.get(`${TMDB_BASE_URL}/trending/all/week`, {
        params: {
          api_key: apiKey
        }
      });

      const trending = trendingResponse.data.results
        .filter(item => item.poster_path && item.backdrop_path && !topShows.some(s => s.tmdbId === item.id))
        .map(item => ({
          _id: `${item.media_type}-${item.id}`,
          tmdbId: item.id,
          title: item.media_type === 'movie' ? item.title : item.name,
          type: item.media_type,
          posterPath: getTMDBImageUrl(item.poster_path),
          backdropPath: getTMDBImageUrl(item.backdrop_path),
          overview: item.overview,
          releaseDate: item.media_type === 'movie' ? item.release_date : item.first_air_date,
          voteAverage: item.vote_average
        }));

      // Add to our list until we reach the limit
      for (let i = 0; i < trending.length && topShows.length < limit; i++) {
        topShows.push(trending[i]);
      }
    }

    // Get detailed information for each show to match getMediaDetails output format
    const detailedShowPromises = topShows.map(async (show) => {
      try {
        const detailsUrl = `${TMDB_BASE_URL}/${show.type}/${show.tmdbId}`;
        const detailsResponse = await axios.get(detailsUrl, {
          params: {
            api_key: apiKey,
            language: 'en-US',
            append_to_response: 'credits,images,videos'
          }
        });
        
        const details = detailsResponse.data;
        
        // Get content ratings/certifications
        let maturityRating = 'NR';
        try {
          if (show.type === 'movie') {
            const releaseDatesUrl = `${TMDB_BASE_URL}/movie/${show.tmdbId}/release_dates`;
            const releaseDatesResponse = await axios.get(releaseDatesUrl, {
              params: { api_key: apiKey }
            });
            const usReleases = releaseDatesResponse.data.results.find(r => r.iso_3166_1 === 'US');
            if (usReleases && usReleases.release_dates && usReleases.release_dates.length > 0) {
              maturityRating = usReleases.release_dates[0].certification || 'NR';
            }
          } else {
            const contentRatingsUrl = `${TMDB_BASE_URL}/tv/${show.tmdbId}/content_ratings`;
            const contentRatingsResponse = await axios.get(contentRatingsUrl, {
              params: { api_key: apiKey }
            });
            const usRating = contentRatingsResponse.data.results.find(r => r.iso_3166_1 === 'US');
            if (usRating) {
              maturityRating = usRating.rating || 'NR';
            }
          }
        } catch (error) {
          console.error('Error fetching ratings:', error.message);
        }
        
        // Get three additional images
        const backdropUrl = getTMDBImageUrl(details.backdrop_path, 'w500');
        const posterUrl = getTMDBImageUrl(details.poster_path, 'w500');
        const additionalImages = [
          backdropUrl || posterUrl,
          posterUrl || backdropUrl,
          backdropUrl || posterUrl
        ];
        
        // Try to get different images if available
        if (details.images && details.images.backdrops && details.images.backdrops.length > 1) {
          const backdrops = details.images.backdrops
            .filter(img => img.file_path !== details.backdrop_path)
            .slice(0, 2)
            .map(img => getTMDBImageUrl(img.file_path, 'w500'));
          
          if (backdrops.length > 0) {
            additionalImages[2] = backdrops[0];
          }
          
          if (backdrops.length > 1) {
            additionalImages[1] = backdrops[1];
          }
        }
        
        return {
          _id: show._id,
          tmdbId: show.tmdbId,
          title: show.title,
          type: show.type,
          overview: show.overview,
          posterPath: show.posterPath,
          backdropPath: show.backdropPath,
          releaseDate: show.releaseDate,
          voteAverage: show.voteAverage,
          genres: details.genres?.map(genre => genre.name) || [],
          runtime: show.type === 'movie' ? (details.runtime || 90) : 
                  (details.episode_run_time && details.episode_run_time.length > 0 ? 
                  details.episode_run_time[0] : 30),
          maturityRating: maturityRating,
          additionalImages: additionalImages,
          cast: details.credits?.cast?.slice(0, 15).map(actor => ({
            id: actor.id,
            name: actor.name,
            character: actor.character,
            profilePath: actor.profile_path ? getTMDBImageUrl(actor.profile_path, 'w185') : null
          })) || []
        };
      } catch (error) {
        console.error(`Error getting details for ${show.type} ${show.tmdbId}:`, error.message);
        // Return the basic show info if we can't get details
        return show;
      }
    });
    
    const detailedShows = await Promise.all(detailedShowPromises);
    
    res.json({ results: detailedShows });
  } catch (error) {
    console.error('Error fetching top shows in Israel:', error);
    res.status(500).json({ message: 'Error fetching top shows in Israel', error: error.message });
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
    
    // Get additional images - USING DIVERSE IMAGE TYPES
    let additionalImages = [];
    
    try {
      // Get the main backdrop and poster URLs to exclude them
      const mainBackdropUrl = getTMDBImageUrl(detailsResponse.data.backdrop_path, 'w500');
      const mainPosterUrl = getTMDBImageUrl(detailsResponse.data.poster_path, 'w500');
      
      // Identify which images to exclude
      const excludedPaths = [
        detailsResponse.data.backdrop_path,
        detailsResponse.data.poster_path
      ].filter(Boolean);
      
      // Array to collect different types of images
      const imageOptions = [];
      
      // 1. Try to get backdrops (excluding main)
      if (detailsResponse.data.images && detailsResponse.data.images.backdrops) {
        const backdrops = detailsResponse.data.images.backdrops
          .filter(img => !excludedPaths.includes(img.file_path))
          .slice(0, 3)
          .map(img => getTMDBImageUrl(img.file_path, 'w500'));
          
        imageOptions.push(...backdrops);
      }
      
      // 2. Try to get posters (excluding main)
      if (imageOptions.length < 3 && detailsResponse.data.images && details.images.posters) {
        const posters = detailsResponse.data.images.posters
          .filter(img => !excludedPaths.includes(img.file_path))
          .slice(0, 3)
          .map(img => getTMDBImageUrl(img.file_path, 'w500'));
          
        imageOptions.push(...posters.filter(url => !imageOptions.includes(url)));
      }
      
      // 3. For TV shows, try to get episode stills from season 1
      if (mediaType === 'tv' && imageOptions.length < 3) {
        try {
          const seasonUrl = `${TMDB_BASE_URL}/tv/${tmdbId}/season/1/images`;
          const seasonResponse = await axios.get(seasonUrl, {
            params: { api_key: apiKey }
          });
          
          if (seasonResponse.data && seasonResponse.data.stills) {
            const stills = seasonResponse.data.stills
              .slice(0, 3)
              .map(img => getTMDBImageUrl(img.file_path, 'w500'));
              
            imageOptions.push(...stills.filter(url => !imageOptions.includes(url)));
          }
        } catch (error) {
          console.log('Error fetching season stills:', error.message);
        }
      }
      
      // 4. Try to get logos
      if (imageOptions.length < 3) {
        try {
          const imagesUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/images`;
          const imagesResponse = await axios.get(imagesUrl, {
            params: { 
              api_key: apiKey,
              include_image_language: 'en,null'
            }
          });
          
          if (imagesResponse.data && imagesResponse.data.logos && imagesResponse.data.logos.length > 0) {
            const logos = imagesResponse.data.logos
              .slice(0, 2)
              .map(img => getTMDBImageUrl(img.file_path, 'w500'));
              
            imageOptions.push(...logos.filter(url => !imageOptions.includes(url)));
          }
        } catch (error) {
          console.log('Error fetching logos:', error.message);
        }
      }
      
      // If we still don't have enough, add trailer screenshots via videos endpoint
      if (imageOptions.length < 3 && detailsResponse.data.videos && detailsResponse.data.videos.results) {
        const trailers = detailsResponse.data.videos.results
          .filter(video => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser'))
          .slice(0, 2);
          
        if (trailers.length > 0) {
          trailers.forEach(trailer => {
            const thumbnailUrl = `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`;
            if (!imageOptions.includes(thumbnailUrl)) {
              imageOptions.push(thumbnailUrl);
            }
          });
        }
      }
      
      // Lastly, if we're still short on images, use the main backdrop and poster as fallbacks
      if (imageOptions.length < 3) {
        if (mainBackdropUrl && !imageOptions.includes(mainBackdropUrl)) {
          imageOptions.push(mainBackdropUrl);
        }
        
        if (imageOptions.length < 3 && mainPosterUrl && !imageOptions.includes(mainPosterUrl)) {
          imageOptions.push(mainPosterUrl);
        }
      }
      
      // Take the first 3 unique images or fill with duplicates if needed
      if (imageOptions.length >= 3) {
        additionalImages = imageOptions.slice(0, 3);
      } else {
        // Use what we have and fill the rest with placeholders
        additionalImages = [...imageOptions];
        
        // If we have at least one image, duplicate it rather than using placeholders
        if (imageOptions.length > 0) {
          while (additionalImages.length < 3) {
            additionalImages.push(imageOptions[0]);
          }
      } else {
          // Worst case - use placeholders
          while (additionalImages.length < 3) {
            additionalImages.push('https://via.placeholder.com/500x281?text=No+Image+Available');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching additional images:', error.message);
      // Use fallback images if needed
      const fallbackImage = getTMDBImageUrl(detailsResponse.data.backdrop_path, 'w500') || 
                         getTMDBImageUrl(detailsResponse.data.poster_path, 'w500') ||
                         'https://via.placeholder.com/500x281?text=No+Image+Available';
      additionalImages = [fallbackImage, fallbackImage, fallbackImage];
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

// Get new releases from TMDB (movies and TV shows)
exports.getNewReleases = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const mediaType = req.query.type || null; // 'movie', 'tv', or null for both
    
    // Get current date and date 60 days ago for "new releases" (extended from 30 to ensure more results)
    const today = new Date();
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);
    
    const fromDate = sixtyDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const toDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Arrays to store results
    let releases = [];
    
    // Helper function to fetch releases by type
    const fetchReleasesByType = async (type) => {
      // Cache key based on type and date range
      const cacheKey = `new_releases_${type}_${fromDate}_${toDate}`;
      const cachedData = globalThis[cacheKey];
      
      // Return cached data if available and not older than 30 minutes
      if (cachedData && (Date.now() - cachedData.timestamp) < 30 * 60 * 1000) {
        console.log(`Using cached data for ${type}`);
        return cachedData.data;
      }
      
      console.log(`Fetching fresh data for ${type}`);
      const primaryDateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
      const discoverUrl = `${TMDB_BASE_URL}/discover/${type}`;
      
      // First, get a list of popular new releases with basic info
      const response = await axios.get(discoverUrl, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US',
          sort_by: `${primaryDateField}.desc`,
          [`${primaryDateField}.gte`]: fromDate,
          [`${primaryDateField}.lte`]: toDate,
          with_original_language: 'en',
          'vote_count.gte': 20, // Lowered from 30 to get more results
          'vote_average.gte': 5.0, // Lowered from 5.5 to get more results
          include_adult: false,
          page: 1
        }
      });
      
      // Pre-filter items to only include those with basic required fields
      const filteredItems = response.data.results.filter(item => 
        item.backdrop_path && 
        item.poster_path &&
        item.overview
      );
      
      // If we don't have enough items, try fetching page 2
      let allItems = [...filteredItems];
      if (filteredItems.length < limit * 3) {
        try {
          const page2Response = await axios.get(discoverUrl, {
            params: {
              api_key: TMDB_API_KEY,
              language: 'en-US',
              sort_by: `${primaryDateField}.desc`,
              [`${primaryDateField}.gte`]: fromDate,
              [`${primaryDateField}.lte`]: toDate,
              with_original_language: 'en',
              'vote_count.gte': 20,
              'vote_average.gte': 5.0,
              include_adult: false,
              page: 2
            }
          });
          
          const page2FilteredItems = page2Response.data.results.filter(item => 
            item.backdrop_path && 
            item.poster_path &&
            item.overview
          );
          
          allItems = [...allItems, ...page2FilteredItems];
        } catch (error) {
          console.error('Error fetching page 2:', error);
          // Continue with what we have
        }
      }
      
      // Process up to triple the limit to ensure we have enough after filtering
      const itemsToProcess = allItems.slice(0, limit * 3);
      
      // Use Promise.all to fetch all detail promises concurrently
      const detailPromises = itemsToProcess.map(async (item) => {
        try {
          // Get detailed info with append_to_response to combine multiple requests
          const detailsUrl = `${TMDB_BASE_URL}/${type}/${item.id}`;
          const detailsResponse = await axios.get(detailsUrl, {
            params: {
              api_key: TMDB_API_KEY,
              language: 'en-US',
              append_to_response: 'credits,images,keywords'
            }
          });
          
          const details = detailsResponse.data;
          
          // Less strict filtering - only skip if really critical fields are missing
          if (!details.backdrop_path || !details.credits?.cast || details.credits.cast.length < 2) {
            return null;
          }
          
          // Get content ratings/certifications - make optional
          let maturityRating = 'NR';
          try {
            if (type === 'movie') {
              const releaseDatesUrl = `${TMDB_BASE_URL}/movie/${item.id}/release_dates`;
              const releaseDatesResponse = await axios.get(releaseDatesUrl, {
                params: { api_key: TMDB_API_KEY }
              });
              const usReleases = releaseDatesResponse.data.results.find(r => r.iso_3166_1 === 'US');
              if (usReleases && usReleases.release_dates && usReleases.release_dates.length > 0) {
                maturityRating = usReleases.release_dates[0].certification || 'NR';
              }
            } else {
              const contentRatingsUrl = `${TMDB_BASE_URL}/tv/${item.id}/content_ratings`;
              const contentRatingsResponse = await axios.get(contentRatingsUrl, {
                params: { api_key: TMDB_API_KEY }
              });
              const usRating = contentRatingsResponse.data.results.find(r => r.iso_3166_1 === 'US');
              if (usRating) {
                maturityRating = usRating.rating || 'NR';
              }
            }
          } catch (error) {
            console.error(`Error fetching ratings for ${type} ${item.id}:`, error.message);
            // Continue with default 'NR' rating
          }
          
          // Get keywords - make optional
          let keywords = [];
          try {
            // Try to get keywords from append_to_response result
            if (details.keywords) {
              if (type === 'movie' && details.keywords.keywords) {
                keywords = details.keywords.keywords.map(k => k.name);
              } else if (type === 'tv' && details.keywords.results) {
                keywords = details.keywords.results.map(k => k.name);
              }
            }
          } catch (error) {
            // Just continue with empty keywords
          }
          
          // Process images if available - ensure 3 distinct images
          let additionalImages = [];
          try {
            // Prepare collections of all available images
            const allAvailableImages = [];
            
            // 1. Add backdrops (not including the main backdrop)
            if (details.images && details.images.backdrops && details.images.backdrops.length > 0) {
              const backdropImages = details.images.backdrops
                .filter(img => img.file_path !== details.backdrop_path)
                .map(img => ({
                  url: getTMDBImageUrl(img.file_path, 'w500'),
                  type: 'backdrop',
                  voteAverage: img.vote_average || 0
                }));
              allAvailableImages.push(...backdropImages);
            }
            
            // 2. Add posters (not including the main poster)
            if (details.images && details.images.posters && details.images.posters.length > 0) {
              const posterImages = details.images.posters
                .filter(img => img.file_path !== details.poster_path)
                .map(img => ({
                  url: getTMDBImageUrl(img.file_path, 'w500'),
                  type: 'poster',
                  voteAverage: img.vote_average || 0
                }));
              allAvailableImages.push(...posterImages);
            }
            
            // 3. For TV shows, add season stills
            if (type === 'tv') {
              try {
                const seasonStillsUrl = `${TMDB_BASE_URL}/tv/${item.id}/season/1/images`;
                const seasonStillsResponse = await axios.get(seasonStillsUrl, {
                  params: { api_key: TMDB_API_KEY }
                });
                
                if (seasonStillsResponse.data && seasonStillsResponse.data.stills) {
                  const stillImages = seasonStillsResponse.data.stills
                    .map(img => ({
                      url: getTMDBImageUrl(img.file_path, 'w500'),
                      type: 'still',
                      voteAverage: img.vote_average || 0
                    }));
                  allAvailableImages.push(...stillImages);
                }
              } catch (error) {
                console.error(`Error fetching season stills for ${item.id}:`, error.message);
              }
            }
            
            // Sort all available images by vote average (higher votes first)
            allAvailableImages.sort((a, b) => b.voteAverage - a.voteAverage);
            
            // 4. Add primary images to ensure we always have at least these
            const mainBackdropUrl = getTMDBImageUrl(details.backdrop_path, 'w500');
            const mainPosterUrl = getTMDBImageUrl(details.poster_path, 'w500');
            
            // Create array of primary URLs to check against
            const primaryUrls = [mainBackdropUrl, mainPosterUrl].filter(Boolean);
            
            // Strategy: Select a diverse set of images (prefer one of each type if available)
            // First try to get one backdrop, one poster, and one still for maximum diversity
            const typeTargets = ['backdrop', 'poster', 'still'];
            for (const targetType of typeTargets) {
              if (additionalImages.length >= 3) break;
              
              const typeImage = allAvailableImages.find(img => 
                img.type === targetType && 
                !additionalImages.includes(img.url) && 
                !primaryUrls.includes(img.url)
              );
              
              if (typeImage) {
                additionalImages.push(typeImage.url);
              }
            }
            
            // If we still need more, just get the highest voted remaining images
            const remainingImages = allAvailableImages
              .filter(img => !additionalImages.includes(img.url) && !primaryUrls.includes(img.url))
              .map(img => img.url);
            
            while (additionalImages.length < 3 && remainingImages.length > 0) {
              additionalImages.push(remainingImages.shift());
            }
            
            // If we STILL don't have enough unique images, add primary images
            if (additionalImages.length < 3) {
              if (!additionalImages.includes(mainBackdropUrl) && mainBackdropUrl) {
                additionalImages.push(mainBackdropUrl);
              }
              
              if (additionalImages.length < 3 && !additionalImages.includes(mainPosterUrl) && mainPosterUrl) {
                additionalImages.push(mainPosterUrl);
              }
              
              // Last resort: duplicate the most different image we have
              while (additionalImages.length < 3) {
                // If we have 2 images and one is backdrop and one is poster, add a still or another image
                // otherwise add a completely different 3rd image
                const backdropCount = additionalImages.filter(img => img === mainBackdropUrl).length;
                const posterCount = additionalImages.filter(img => img === mainPosterUrl).length;
                
                // Choose the image with the least occurrences
                if (backdropCount <= posterCount && mainBackdropUrl) {
                  additionalImages.push(mainBackdropUrl);
                } else {
                  additionalImages.push(mainPosterUrl || mainBackdropUrl);
                }
              }
            }
            
            // Ensure we have exactly 3 images
            additionalImages = additionalImages.slice(0, 3);
            
            // Ensure we don't have all identical images
            const uniqueUrls = [...new Set(additionalImages)];
            if (uniqueUrls.length === 1 && (mainBackdropUrl !== mainPosterUrl) && mainPosterUrl) {
              // If all images are identical, force at least one different image
              additionalImages[1] = mainPosterUrl;
            }
          } catch (error) {
            // In case of any error, use fallback strategy
            console.error(`Error processing images for ${type} ${item.id}:`, error.message);
            const backdropUrl = getTMDBImageUrl(details.backdrop_path, 'w500');
            const posterUrl = getTMDBImageUrl(details.poster_path, 'w500');
            
            if (backdropUrl && posterUrl && backdropUrl !== posterUrl) {
              // If we have both backdrop and poster and they're different, use them
              additionalImages = [backdropUrl, posterUrl, backdropUrl];
            } else if (backdropUrl) {
              // If we only have backdrop or they're the same, make small variations
              additionalImages = [
                backdropUrl,
                backdropUrl,
                backdropUrl
              ];
            } else if (posterUrl) {
              // If we only have poster, use it
              additionalImages = [
                posterUrl,
                posterUrl,
                posterUrl
              ];
            } else {
              // Worst case: use placeholder images (shouldn't happen with our filtering)
              additionalImages = [
                'https://via.placeholder.com/500x281?text=No+Image+Available',
                'https://via.placeholder.com/500x281?text=No+Image+Available',
                'https://via.placeholder.com/500x281?text=No+Image+Available'
              ];
            }
          }
          
          // Double-check that we have exactly 3 images before continuing
          if (additionalImages.length !== 3) {
            // Fill or trim as needed
            const backdropUrl = getTMDBImageUrl(details.backdrop_path, 'w500') || 
                               getTMDBImageUrl(details.poster_path, 'w500') ||
                               'https://via.placeholder.com/500x281?text=No+Image+Available';
            
            while (additionalImages.length < 3) {
              additionalImages.push(backdropUrl);
            }
            additionalImages = additionalImages.slice(0, 3);
          }
          
          // For TV shows, fetch season data - make optional 
          let seasonData = [];
          if (type === 'tv' && details.number_of_seasons > 0) {
            try {
              const seasonUrl = `${TMDB_BASE_URL}/tv/${item.id}/season/1`;
              const seasonResponse = await axios.get(seasonUrl, {
                params: { api_key: TMDB_API_KEY, language: 'en-US' }
              });
              
              seasonData.push({
                seasonNumber: 1,
                episodes: seasonResponse.data.episodes.map(episode => ({
                  episodeNumber: episode.episode_number,
                  name: episode.name,
                  overview: episode.overview || 'No overview available',
                  stillPath: episode.still_path ? getTMDBImageUrl(episode.still_path, 'w300') : null,
                  airDate: episode.air_date,
                  runtime: episode.runtime || 30
                }))
              });
            } catch (error) {
              console.error(`Error fetching season data for TV show ${item.id}:`, error.message);
              // Continue without season data
            }
          }
          
          // Construct item - with safe defaults for missing fields
          return {
            id: item.id,
            tmdbId: item.id,
            title: type === 'movie' ? details.title || item.title : details.name || item.name,
            type: type,
            posterPath: getTMDBImageUrl(details.poster_path),
            backdropPath: getTMDBImageUrl(details.backdrop_path),
            overview: details.overview || item.overview || 'No overview available',
            releaseDate: type === 'movie' ? details.release_date : details.first_air_date,
            voteAverage: details.vote_average || item.vote_average || 0,
            trending: item.popularity > 1000,
            seasons: type === 'tv' ? (details.number_of_seasons || 1) : null,
            runtime: type === 'movie' ? (details.runtime || 90) : 
              (details.episode_run_time && details.episode_run_time.length > 0 ? 
                details.episode_run_time[0] : 30),
            genres: details.genres?.map(genre => genre.name) || [],
            contentTags: keywords.slice(0, 5),
            maturityRating: maturityRating,
            additionalImages: additionalImages,
            seasonData: type === 'tv' ? seasonData : null,
            cast: details.credits?.cast?.slice(0, 15).map(actor => ({
              id: actor.id,
              name: actor.name,
              character: actor.character,
              profilePath: actor.profile_path ? getTMDBImageUrl(actor.profile_path, 'w185') : null
            })) || [],
            director: type === 'movie' && details.credits ? 
              details.credits.crew.find(person => person.job === 'Director')?.name || 'Unknown' : null,
            creators: type === 'tv' ? 
              details.created_by?.map(creator => creator.name) || ['Unknown'] : null
          };
        } catch (error) {
          console.error(`Error processing ${type} ${item.id}:`, error.message);
          return null;
        }
      });
      
      // Wait for all promises to resolve and filter out null results
      let detailedItems = (await Promise.all(detailPromises)).filter(item => item !== null);
      
      // Cache the result
      globalThis[cacheKey] = {
        data: detailedItems,
        timestamp: Date.now()
      };
      
      return detailedItems;
    };
    
    // Fetch releases based on mediaType
    if (!mediaType || mediaType === 'all') {
      // Fetch both movie and TV releases with proportional limits to ensure mix
      const movieLimit = Math.max(5, Math.ceil(limit / 2));
      const tvLimit = Math.max(5, limit - movieLimit);
      
      // Fetch both types concurrently
      const [movieReleases, tvReleases] = await Promise.all([
        fetchReleasesByType('movie'),
        fetchReleasesByType('tv')
      ]);
      
      console.log(`Got ${movieReleases.length} movies and ${tvReleases.length} TV shows`);
      
      // Take what we need from each type, but ensure we have at least 10 total
      const topMovies = movieReleases.slice(0, movieLimit);
      const topTVShows = tvReleases.slice(0, tvLimit);
      
      // Combine and sort by release date
      releases = [...topMovies, ...topTVShows]
        .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      
      // If we still don't have enough, backfill with whatever we have more of
      if (releases.length < limit) {
        if (movieReleases.length > movieLimit) {
          const extraMovies = movieReleases.slice(movieLimit, movieLimit + (limit - releases.length));
          releases = [...releases, ...extraMovies]
            .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
        } else if (tvReleases.length > tvLimit) {
          const extraTVShows = tvReleases.slice(tvLimit, tvLimit + (limit - releases.length));
          releases = [...releases, ...extraTVShows]
            .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
        }
      }
    } else {
      // Fetch only the specified type
      releases = await fetchReleasesByType(mediaType);
      console.log(`Got ${releases.length} ${mediaType} releases`);
      releases = releases.slice(0, limit);
    }
    
    console.log(`Returning ${releases.length} items out of requested ${limit}`);
    res.json({ results: releases });
  } catch (error) {
    console.error('Error fetching new releases:', error);
    res.status(500).json({ message: 'Error fetching new releases' });
  }
};

// Get additional images for a media item
exports.getMediaImages = async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.params;
    const { limit = 10, types = 'all' } = req.query;
    
    if (!tmdbId || !mediaType || (mediaType !== 'movie' && mediaType !== 'tv')) {
      return res.status(400).json({ message: 'Invalid parameters. Required: tmdbId and mediaType (movie or tv)' });
    }
    
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key is missing' });
    }

    // Array to store all images
    const allImages = [];
    
    // Get images from main endpoint - includes backdrops, posters, logos
    const imagesUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/images`;
    const imagesResponse = await axios.get(imagesUrl, {
      params: { 
        api_key: apiKey,
        include_image_language: 'en,null' 
      }
    });
    
    // Process backdrops
    if ((types === 'all' || types.includes('backdrop')) && 
        imagesResponse.data && imagesResponse.data.backdrops) {
      const backdrops = imagesResponse.data.backdrops.map(image => ({
        url: getTMDBImageUrl(image.file_path, 'w780'),
        thumbnailUrl: getTMDBImageUrl(image.file_path, 'w300'),
        type: 'backdrop',
        width: image.width,
        height: image.height,
        aspectRatio: image.aspect_ratio
      }));
      allImages.push(...backdrops);
    }
    
    // Process posters
    if ((types === 'all' || types.includes('poster')) && 
        imagesResponse.data && imagesResponse.data.posters) {
      const posters = imagesResponse.data.posters.map(image => ({
        url: getTMDBImageUrl(image.file_path, 'w780'),
        thumbnailUrl: getTMDBImageUrl(image.file_path, 'w300'),
        type: 'poster',
        width: image.width,
        height: image.height,
        aspectRatio: image.aspect_ratio
      }));
      allImages.push(...posters);
    }
    
    // Process logos
    if ((types === 'all' || types.includes('logo')) && 
        imagesResponse.data && imagesResponse.data.logos) {
      const logos = imagesResponse.data.logos.map(image => ({
        url: getTMDBImageUrl(image.file_path, 'w500'),
        thumbnailUrl: getTMDBImageUrl(image.file_path, 'w300'),
        type: 'logo',
        width: image.width,
        height: image.height,
        aspectRatio: image.aspect_ratio
      }));
      allImages.push(...logos);
    }
    
    // For TV shows, get episode stills from season 1
    if (mediaType === 'tv' && (types === 'all' || types.includes('still'))) {
      try {
        const seasonUrl = `${TMDB_BASE_URL}/tv/${tmdbId}/season/1/images`;
        const seasonResponse = await axios.get(seasonUrl, {
          params: { api_key: apiKey }
        });
        
        if (seasonResponse.data && seasonResponse.data.stills) {
          const stills = seasonResponse.data.stills.map(image => ({
            url: getTMDBImageUrl(image.file_path, 'w780'),
            thumbnailUrl: getTMDBImageUrl(image.file_path, 'w300'),
            type: 'still',
            width: image.width,
            height: image.height,
            aspectRatio: image.aspect_ratio,
            seasonNumber: 1
          }));
          allImages.push(...stills);
        }
      } catch (error) {
        console.log('Error fetching season stills:', error.message);
      }
    }
    
    // Get videos for trailer thumbnails
    if (types === 'all' || types.includes('video')) {
      try {
        const videosUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/videos`;
        const videosResponse = await axios.get(videosUrl, {
          params: { api_key: apiKey }
        });
        
        if (videosResponse.data && videosResponse.data.results) {
          const videos = videosResponse.data.results
            .filter(video => video.site === 'YouTube' && 
                   (video.type === 'Trailer' || video.type === 'Teaser' || video.type === 'Clip'))
            .map(video => ({
              url: `https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`,
              thumbnailUrl: `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`,
              type: 'video',
              videoId: video.key,
              videoType: video.type,
              videoName: video.name,
              videoSite: video.site
            }));
          allImages.push(...videos);
        }
      } catch (error) {
        console.log('Error fetching videos:', error.message);
      }
    }
    
    // Get movie/show details to include main backdrop and poster
    if (types === 'all' || types.includes('main')) {
      try {
        const detailsUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}`;
        const detailsResponse = await axios.get(detailsUrl, {
          params: { api_key: apiKey }
        });
        
        if (detailsResponse.data) {
          if (detailsResponse.data.backdrop_path) {
            allImages.push({
              url: getTMDBImageUrl(detailsResponse.data.backdrop_path, 'original'),
              thumbnailUrl: getTMDBImageUrl(detailsResponse.data.backdrop_path, 'w300'),
              type: 'main_backdrop',
              isPrimary: true
            });
          }
          
          if (detailsResponse.data.poster_path) {
            allImages.push({
              url: getTMDBImageUrl(detailsResponse.data.poster_path, 'original'),
              thumbnailUrl: getTMDBImageUrl(detailsResponse.data.poster_path, 'w300'),
              type: 'main_poster',
              isPrimary: true
            });
          }
        }
      } catch (error) {
        console.log('Error fetching main images:', error.message);
      }
    }
    
    // Return the images, limited by the requested amount
    return res.json({
      mediaType,
      tmdbId,
      totalImages: allImages.length,
      images: allImages.slice(0, parseInt(limit, 10))
    });
    
  } catch (error) {
    console.error('Error in getMediaImages:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get animation media (movies and TV shows) from TMDB
exports.getAnimationMedia = async (req, res) => {
  try {
    const { limit = 10, mediaType } = req.query;
    const apiKey = process.env.TMDB_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key is missing' });
    }

    // Animation genre IDs in TMDB
    const ANIMATION_GENRE_ID = 16; // Animation genre ID in TMDB
    
    // Arrays to store results
    let animationMovies = [];
    let animationTVShows = [];
    
    // Fetch animation movies if mediaType is 'all' or 'movie'
    if (!mediaType || mediaType === 'all' || mediaType === 'movie') {
      try {
        const moviesResponse = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
          params: {
            api_key: apiKey,
            with_genres: ANIMATION_GENRE_ID,
            language: 'en-US',
            sort_by: 'popularity.desc',
            include_adult: false,
            page: 1
          }
        });
        
        animationMovies = moviesResponse.data.results
          .filter(movie => movie.poster_path && movie.backdrop_path)
          .map(movie => ({
            id: movie.id,
            tmdbId: movie.id,
            title: movie.title,
            type: 'movie',
            overview: movie.overview,
            posterPath: getTMDBImageUrl(movie.poster_path),
            backdropPath: getTMDBImageUrl(movie.backdrop_path),
            releaseDate: movie.release_date,
            voteAverage: movie.vote_average,
            genres: ['Animation'] // We know it's in the Animation genre
          }));
      } catch (error) {
        console.error('Error fetching animation movies:', error.message);
      }
    }
    
    // Fetch animation TV shows if mediaType is 'all' or 'tv'
    if (!mediaType || mediaType === 'all' || mediaType === 'tv') {
      try {
        const tvResponse = await axios.get(`${TMDB_BASE_URL}/discover/tv`, {
          params: {
            api_key: apiKey,
            with_genres: ANIMATION_GENRE_ID,
            language: 'en-US',
            sort_by: 'popularity.desc',
            include_adult: false,
            page: 1
          }
        });
        
        animationTVShows = tvResponse.data.results
          .filter(show => show.poster_path && show.backdrop_path)
          .map(show => ({
            id: show.id,
            tmdbId: show.id,
            title: show.name,
            type: 'tv',
            overview: show.overview,
            posterPath: getTMDBImageUrl(show.poster_path),
            backdropPath: getTMDBImageUrl(show.backdrop_path),
            releaseDate: show.first_air_date,
            voteAverage: show.vote_average,
            genres: ['Animation'] // We know it's in the Animation genre
          }));
      } catch (error) {
        console.error('Error fetching animation TV shows:', error.message);
      }
    }
    
    // Combine results based on mediaType
    let combinedResults = [];
    if (!mediaType || mediaType === 'all') {
      // For 'all', we want a mix of movies and TV shows
      // Interleave results to get a good mix
      const maxItems = Math.max(animationMovies.length, animationTVShows.length);
      for (let i = 0; i < maxItems; i++) {
        if (i < animationMovies.length) combinedResults.push(animationMovies[i]);
        if (i < animationTVShows.length) combinedResults.push(animationTVShows[i]);
      }
    } else if (mediaType === 'movie') {
      combinedResults = animationMovies;
    } else if (mediaType === 'tv') {
      combinedResults = animationTVShows;
    }
    
    // Sort by popularity (using vote average as a proxy) and limit results
    const results = combinedResults
      .sort((a, b) => b.voteAverage - a.voteAverage)
      .slice(0, parseInt(limit, 10));
    
    res.json({
      results,
      totalResults: results.length
    });
  } catch (error) {
    console.error('Error fetching animation media:', error);
    res.status(500).json({ message: 'Error fetching animation media', error: error.message });
  }
};

// Get action media (movies and TV shows) from TMDB
exports.getActionMedia = async (req, res) => {
  try {
    const { limit = 10, mediaType } = req.query;
    const apiKey = process.env.TMDB_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key is missing' });
    }

    // Action genre IDs in TMDB
    const ACTION_GENRE_ID = 28; // Action genre ID for movies
    const ACTION_ADVENTURE_GENRE_ID = 10759; // Action & Adventure genre ID for TV shows
    
    // Arrays to store results
    let actionMovies = [];
    let actionTVShows = [];
    
    // Fetch action movies if mediaType is 'all' or 'movie'
    if (!mediaType || mediaType === 'all' || mediaType === 'movie') {
      try {
        const moviesResponse = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
          params: {
            api_key: apiKey,
            with_genres: ACTION_GENRE_ID,
            language: 'en-US',
            sort_by: 'popularity.desc',
            include_adult: false,
            page: 1
          }
        });
        
        actionMovies = moviesResponse.data.results
          .filter(movie => movie.poster_path && movie.backdrop_path)
          .map(movie => ({
            id: movie.id,
            tmdbId: movie.id,
            title: movie.title,
            type: 'movie',
            overview: movie.overview,
            posterPath: getTMDBImageUrl(movie.poster_path),
            backdropPath: getTMDBImageUrl(movie.backdrop_path),
            releaseDate: movie.release_date,
            voteAverage: movie.vote_average,
            genres: ['Action'] // We know it's in the Action genre
          }));
      } catch (error) {
        console.error('Error fetching action movies:', error.message);
      }
    }
    
    // Fetch action TV shows if mediaType is 'all' or 'tv'
    if (!mediaType || mediaType === 'all' || mediaType === 'tv') {
      try {
        const tvResponse = await axios.get(`${TMDB_BASE_URL}/discover/tv`, {
          params: {
            api_key: apiKey,
            with_genres: ACTION_ADVENTURE_GENRE_ID, // Action & Adventure for TV
            language: 'en-US',
            sort_by: 'popularity.desc',
            include_adult: false,
            page: 1
          }
        });
        
        actionTVShows = tvResponse.data.results
          .filter(show => show.poster_path && show.backdrop_path)
          .map(show => ({
            id: show.id,
            tmdbId: show.id,
            title: show.name,
            type: 'tv',
            overview: show.overview,
            posterPath: getTMDBImageUrl(show.poster_path),
            backdropPath: getTMDBImageUrl(show.backdrop_path),
            releaseDate: show.first_air_date,
            voteAverage: show.vote_average,
            genres: ['Action & Adventure'] // We know it's in the Action & Adventure genre
          }));
      } catch (error) {
        console.error('Error fetching action TV shows:', error.message);
      }
    }
    
    // Combine results based on mediaType
    let combinedResults = [];
    if (!mediaType || mediaType === 'all') {
      // For 'all', we want a mix of movies and TV shows
      // Interleave results to get a good mix
      const maxItems = Math.max(actionMovies.length, actionTVShows.length);
      for (let i = 0; i < maxItems; i++) {
        if (i < actionMovies.length) combinedResults.push(actionMovies[i]);
        if (i < actionTVShows.length) combinedResults.push(actionTVShows[i]);
      }
    } else if (mediaType === 'movie') {
      combinedResults = actionMovies;
    } else if (mediaType === 'tv') {
      combinedResults = actionTVShows;
    }
    
    // Sort by popularity (using vote average as a proxy) and limit results
    const results = combinedResults
      .sort((a, b) => b.voteAverage - a.voteAverage)
      .slice(0, parseInt(limit, 10));
    
    res.json({
      results,
      totalResults: results.length
    });
  } catch (error) {
    console.error('Error fetching action media:', error);
    res.status(500).json({ message: 'Error fetching action media', error: error.message });
  }
};

// Get top rated media by users
exports.getTopRatedMediaByUsers = async (req, res) => {
  try {
    const { limit = 15, mediaType = null } = req.query;
    const parsedLimit = parseInt(limit);
    const Review = require('../models/Review');
    const mongoose = require('mongoose');
    const axios = require('axios');

    console.log('Fetching top rated media by users. Limit:', parsedLimit, 'Media type:', mediaType);

    // Aggregation pipeline to get top rated media based on reviews
    const aggregationPipeline = [
      // Match reviews with ratings
      { 
        $match: { 
          rating: { $gt: 0 },
          ...(mediaType ? { media: new RegExp(`^tmdb-${mediaType}-`) } : { media: /^tmdb-/ })
        } 
      },
      // Group by media ID to calculate average ratings and count
      { 
        $group: {
          _id: '$media',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      },
      // Filter to only include media with a minimum number of reviews
      {
        $match: {
          totalReviews: { $gte: 1 } // At least 1 review
        }
      },
      // Sort by rating (descending) and number of reviews (descending)
      {
        $sort: { 
          averageRating: -1, 
          totalReviews: -1 
        }
      },
      // Limit results
      {
        $limit: parsedLimit
      }
    ];

    // Execute the aggregation
    const topRatedMedia = await Review.aggregate(aggregationPipeline);
    
    console.log(`Found ${topRatedMedia.length} top rated media items`);

    // Fetch detailed information for each media from TMDB
    const detailedResults = await Promise.all(
      topRatedMedia.map(async (item) => {
        try {
          // Parse the TMDB ID from the media ID (format: tmdb-type-id)
          const parts = item._id.split('-');
          if (parts.length < 3) {
            console.error(`Invalid TMDB ID format: ${item._id}`);
            return null;
          }

          const type = parts[1]; // movie or tv
          const tmdbId = parts[2];

          // Fetch media details from TMDB API
          const apiKey = process.env.TMDB_API_KEY;
          if (!apiKey) {
            throw new Error('TMDB API key is missing');
          }

          const tmdbResponse = await axios.get(
            `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}&language=en-US`
          );

          // Map TMDB data to our format
          return {
            _id: item._id,
            tmdbId: parseInt(tmdbId),
            title: type === 'movie' ? tmdbResponse.data.title : tmdbResponse.data.name,
            type: type,
            posterPath: `https://image.tmdb.org/t/p/w500${tmdbResponse.data.poster_path}`,
            backdropPath: tmdbResponse.data.backdrop_path ? 
              `https://image.tmdb.org/t/p/original${tmdbResponse.data.backdrop_path}` : null,
            overview: tmdbResponse.data.overview,
            releaseDate: type === 'movie' ? tmdbResponse.data.release_date : tmdbResponse.data.first_air_date,
            voteAverage: tmdbResponse.data.vote_average,
            voteCount: tmdbResponse.data.vote_count,
            genres: tmdbResponse.data.genres.map(g => g.name),
            averageRating: parseFloat(item.averageRating.toFixed(1)),
            totalReviews: item.totalReviews
          };
        } catch (error) {
          console.error(`Error fetching details for media ${item._id}:`, error.message);
          return null;
        }
      })
    );

    // Filter out any failed requests
    const results = detailedResults.filter(item => item !== null);
    
    console.log(`Successfully fetched details for ${results.length} out of ${topRatedMedia.length} media items`);

    // Return results
    res.json({
      results,
      totalResults: results.length,
      page: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error('Error in getTopRatedMediaByUsers:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get new and popular media with pagination
exports.getNewAndPopularMedia = async (req, res) => {
  try {
    const { page = 1, limit = 24, mediaType = 'all' } = req.query;
    const numericPage = parseInt(page, 10);
    const numericLimit = parseInt(limit, 10);
    
    // Helper function to validate image URLs
    const hasValidImages = (item) => {
      // Check that both poster and backdrop exist and are not null or empty
      return item && 
        item.poster_path && 
        item.backdrop_path && 
        item.poster_path.trim() !== '' && 
        item.backdrop_path.trim() !== '' &&
        !item.poster_path.includes('placeholder') &&
        !item.backdrop_path.includes('placeholder');
    };
    
    // Get both movies and TV shows if no specific type is requested
    if (mediaType === 'all' || mediaType === 'both') {
      // Get both movies and shows in parallel
      const [moviesResponse, tvShowsResponse] = await Promise.all([
        axios.get(`${TMDB_BASE_URL}/movie/popular`, {
          params: {
            api_key: process.env.TMDB_API_KEY,
            language: 'en-US',
            page: numericPage,
            region: 'US'
          }
        }),
        axios.get(`${TMDB_BASE_URL}/tv/popular`, {
          params: {
            api_key: process.env.TMDB_API_KEY,
            language: 'en-US',
            page: numericPage,
            region: 'US'
          }
        })
      ]);
      
      // Transform the results, filtering out items with missing images
      const movies = moviesResponse.data.results
        .filter(hasValidImages)
        .map(movie => ({
          ...transformTMDBMovie(movie),
          // Convert genre_ids to genres if needed
          genres: movie.genre_ids 
            ? movie.genre_ids.map(id => getGenreName('movie', id)).filter(Boolean) 
            : []
        }));
      
      const tvShows = tvShowsResponse.data.results
        .filter(hasValidImages)
        .map(show => ({
          ...transformTMDBShow(show),
          // Convert genre_ids to genres if needed
          genres: show.genre_ids 
            ? show.genre_ids.map(id => getGenreName('tv', id)).filter(Boolean) 
            : []
        }));
      
      // Combine and sort by popularity
      const combined = [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);
      const limitedResults = combined.slice(0, numericLimit);
      
      // Determine total pages based on TMDB's data
      const totalPages = Math.max(
        moviesResponse.data.total_pages,
        tvShowsResponse.data.total_pages
      );
      
      // Format response in the same structure used by our database API
      return res.status(200).json({
        results: limitedResults,
        page: numericPage,
        totalPages,
        totalResults: moviesResponse.data.total_results + tvShowsResponse.data.total_results,
      });
    } else {
      // Get only the requested media type
      const endpoint = mediaType === 'movie' ? 'movie/popular' : 'tv/popular';
      
      const response = await axios.get(`${TMDB_BASE_URL}/${endpoint}`, {
        params: {
          api_key: process.env.TMDB_API_KEY,
          language: 'en-US',
          page: numericPage,
          region: 'US'
        }
      });
      
      // Transform based on media type, filtering out items with missing images
      const items = response.data.results
        .filter(hasValidImages);
        
      const transformFunction = mediaType === 'movie' ? transformTMDBMovie : transformTMDBShow;
      
      const results = items.map(item => {
        const transformed = transformFunction(item);
        // Convert genre_ids to genres if needed
        if (item.genre_ids && item.genre_ids.length > 0) {
          transformed.genres = item.genre_ids
            .map(id => getGenreName(mediaType, id))
            .filter(Boolean);
        }
        return transformed;
      });
      
      // Format response
      return res.status(200).json({
        results: results.slice(0, numericLimit),
        page: numericPage,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results
      });
    }
  } catch (error) {
    console.error('Error fetching new and popular media:', error);
    res.status(500).json({ message: 'Error fetching new and popular media', error: error.message });
  }
}; 