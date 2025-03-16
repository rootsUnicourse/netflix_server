// server/index.js
require('dotenv').config(); // Load environment variables first

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const tmdbService = require('./services/tmdbService');

const app = express();

app.use(cors());
app.use(express.json());


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Seed the database with initial content if needed
    seedDatabaseOnStartup();
  })
  .catch((err) => console.error('Error connecting to DB:', err));

// Function to seed the database on startup
async function seedDatabaseOnStartup() {
  try {
    // Check if we need to seed the database
    const shouldSeed = process.env.SEED_ON_STARTUP === 'true';
    
    if (shouldSeed) {
      console.log('Seeding database on startup...');
      await tmdbService.seedDatabase();
    } else {
      console.log('Database seeding on startup is disabled. Set SEED_ON_STARTUP=true to enable.');
    }
  } catch (error) {
    console.error('Error seeding database on startup:', error.message);
  }
}

app.use('/auth', authRoutes);
app.use('/profiles', profileRoutes);
app.use('/media', mediaRoutes);
app.use('/reviews', reviewRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
