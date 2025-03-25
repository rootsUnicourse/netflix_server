/**
 * Script to update the reviews collection's unique index
 * This script drops the old index (user+media) and creates a new one (user+profile+media)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Review = require('../models/Review');

async function updateReviewIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.collection('reviews');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Find and drop the old index
    let oldIndexFound = false;
    for (const index of indexes) {
      if (index.key && index.key.user === 1 && index.key.media === 1 && !index.key.profile) {
        console.log('Found old index to drop:', index.name);
        await collection.dropIndex(index.name);
        oldIndexFound = true;
        console.log('Old index dropped successfully');
      }
    }
    
    if (!oldIndexFound) {
      console.log('Old index not found, it may have been dropped already');
    }
    
    // Ensure the new index exists
    console.log('Creating new index on {user: 1, profile: 1, media: 1}');
    await collection.createIndex(
      { user: 1, profile: 1, media: 1 },
      { unique: true }
    );
    
    console.log('Index update completed successfully');
  } catch (error) {
    console.error('Error updating index:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
updateReviewIndex(); 