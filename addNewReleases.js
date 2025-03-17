/**
 * Script to add new releases to the database
 * 
 * This script will fetch popular movies and TV shows from TMDB,
 * add them to the database, and mark them as new releases.
 * 
 * Usage: node addNewReleases.js
 */

require('dotenv').config();
const addNewReleases = require('./scripts/addNewReleases');

console.log('Starting to add new releases to the database...');

addNewReleases()
  .then(result => {
    console.log('Process completed with result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Process failed:', error);
    process.exit(1);
  }); 