# Media API Tests

This directory contains test scripts to verify that the Media API is working correctly.

## Prerequisites

Before running the tests, make sure you have:

1. Set up your MongoDB connection in the `.env` file
2. Obtained a TMDB API key and added it to the `.env` file
3. Installed all dependencies with `npm install`

## Available Tests

### 1. TMDB API Integration Test

This test verifies that your application can connect to the TMDB API and fetch data.

```bash
npm run test:api
```

This test will:
- Check if your TMDB API key is set correctly
- Search for movies/TV shows
- Fetch trending media
- Get details for a specific movie
- Transform and store the movie in your database

### 2. Media Endpoints Test

This test verifies that your API endpoints are working correctly.

```bash
# First, make sure your server is running
npm run dev

# In a separate terminal, run the endpoint tests
npm run test:endpoints
```

This test will:
- Check if your server is running
- Test the search endpoint
- Test the trending endpoint
- Test fetching a movie by TMDB ID
- Test fetching a movie by MongoDB ID
- Test filtering and sorting media

## Troubleshooting

If the tests fail, check the following:

1. **TMDB API Key**: Make sure your TMDB API key is valid and correctly set in the `.env` file
2. **MongoDB Connection**: Verify that your MongoDB connection string is correct and the database is accessible
3. **Server Running**: For the endpoint tests, ensure your server is running with `npm run dev`
4. **Network Issues**: Check if you have internet connectivity to access the TMDB API

## Next Steps

After confirming that your Media API is working correctly, you can:

1. Integrate it with your frontend
2. Add more features like user ratings, watchlists, etc.
3. Implement caching to improve performance 