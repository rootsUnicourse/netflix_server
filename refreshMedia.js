/**
 * Script to refresh all media data from TMDB
 * 
 * This script will update all media entries in the database with the latest data from TMDB,
 * including the new fields: director, creators, contentTags, maturityRating, additionalImages
 * 
 * Usage: node refreshMedia.js
 */

// Ensure environment variables are loaded
require('dotenv').config();

const refreshAllMedia = require('./scripts/refreshMediaData');

console.log('Starting media refresh process...');

refreshAllMedia()
  .then(result => {
    console.log('Refresh completed with result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Refresh failed:', error);
    process.exit(1);
  }); 