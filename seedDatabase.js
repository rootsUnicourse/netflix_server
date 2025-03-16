// server/seedDatabase.js
require('dotenv').config();
const mongoose = require('mongoose');
const tmdbService = require('./services/tmdbService');

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Starting database seeding...');
    const result = await tmdbService.seedDatabase();
    console.log('Database seeding result:', result);

    // Optionally sync additional content
    if (process.argv.includes('--with-popular')) {
      console.log('Syncing additional popular movies...');
      await tmdbService.syncPopularMovies(20);
      
      console.log('Syncing additional popular TV shows...');
      await tmdbService.syncPopularTVShows(20);
    }

    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDatabase(); 