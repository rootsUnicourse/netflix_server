/**
 * Script to mark existing media as new releases
 * 
 * This script will update a specified number of media items to have newRelease=true
 * 
 * Usage: node markAsNewReleases.js [count]
 * Example: node markAsNewReleases.js 15
 */

require('dotenv').config();
const markAsNewReleases = require('./scripts/markAsNewReleases');

// Get count from command line arguments or use default
const count = process.argv[2] ? parseInt(process.argv[2]) : 10;

console.log(`Starting to mark ${count} media items as new releases...`);

markAsNewReleases(count)
  .then(result => {
    console.log('Process completed with result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Process failed:', error);
    process.exit(1);
  }); 