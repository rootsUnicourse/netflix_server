const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Helper function to get full image URL
const getTMDBImageUrl = (path, size = 'original') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
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
      // Process images if available - ensure 3 distinct images
      // Prepare collections of all available images
      const allAvailableImages = [];
      
      // 1. Add backdrops (not including the main backdrop)
      if (detailsResponse.data.images && detailsResponse.data.images.backdrops && detailsResponse.data.images.backdrops.length > 0) {
        const backdropImages = detailsResponse.data.images.backdrops
          .filter(img => img.file_path !== detailsResponse.data.backdrop_path)
          .map(img => ({
            url: getTMDBImageUrl(img.file_path, 'w500'),
            type: 'backdrop',
            voteAverage: img.vote_average || 0
          }));
        allAvailableImages.push(...backdropImages);
      }
      
      // 2. Add posters (not including the main poster)
      if (detailsResponse.data.images && detailsResponse.data.images.posters && detailsResponse.data.images.posters.length > 0) {
        const posterImages = detailsResponse.data.images.posters
          .filter(img => img.file_path !== detailsResponse.data.poster_path)
          .map(img => ({
            url: getTMDBImageUrl(img.file_path, 'w500'),
            type: 'poster',
            voteAverage: img.vote_average || 0
          }));
        allAvailableImages.push(...posterImages);
      }
      
      // 3. For TV shows, add season stills
      if (mediaType === 'tv') {
        try {
          const seasonStillsUrl = `${TMDB_BASE_URL}/tv/${tmdbId}/season/1/images`;
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
          console.error(`Error fetching season stills for ${tmdbId}:`, error.message);
        }
      }
      
      // Sort all available images by vote average (higher votes first)
      allAvailableImages.sort((a, b) => b.voteAverage - a.voteAverage);
      
      // 4. Add primary images to ensure we always have at least these
      const mainBackdropUrl = getTMDBImageUrl(detailsResponse.data.backdrop_path, 'w500');
      const mainPosterUrl = getTMDBImageUrl(detailsResponse.data.poster_path, 'w500');
      
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
      console.error(`Error processing images for ${mediaType} ${tmdbId}:`, error.message);
      const backdropUrl = getTMDBImageUrl(detailsResponse.data.backdrop_path, 'w500');
      const posterUrl = getTMDBImageUrl(detailsResponse.data.poster_path, 'w500');
      
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
      const backdropUrl = getTMDBImageUrl(detailsResponse.data.backdrop_path, 'w500') || 
                         getTMDBImageUrl(detailsResponse.data.poster_path, 'w500') ||
                         'https://via.placeholder.com/500x281?text=No+Image+Available';
      
      while (additionalImages.length < 3) {
        additionalImages.push(backdropUrl);
      }
      additionalImages = additionalImages.slice(0, 3);
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