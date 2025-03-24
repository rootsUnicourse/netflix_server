// server/index.js
require('dotenv').config(); // Load environment variables first

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tmdbService = require('./services/tmdbService');
const { logSystemEvent } = require('./services/logService');

const app = express();

// Set up CORS with specific origin to allow credentials
app.use(cors({
  origin: 'http://localhost:3000', // Your React client's origin
  credentials: true // Allow cookies/credentials
}));

app.use(express.json());

// Log all requests middleware
app.use((req, res, next) => {
  // Don't log requests to logs endpoint to avoid recursion
  if (!req.path.includes('/admin/logs')) {
    logSystemEvent('HTTP Request', {
      level: 'info',
      details: {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method === 'POST' ? { ...req.body, password: req.body.password ? '[REDACTED]' : undefined } : undefined
      },
      ip: req.ip
    });
  }
  next();
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Seed the database with initial content if needed
    seedDatabaseOnStartup();
    
    // Log successful DB connection
    logSystemEvent('Database connected', {
      level: 'info',
      details: { mongoUri: process.env.MONGO_URI?.replace(/mongodb\+srv:\/\/(.*?)@/, 'mongodb+srv://[REDACTED]@') }
    });
  })
  .catch((err) => {
    console.error('Error connecting to DB:', err);
    
    // Log DB connection error
    logSystemEvent('Database connection failed', {
      level: 'critical',
      details: { error: err.message }
    });
  });

// Function to seed the database on startup
async function seedDatabaseOnStartup() {
  try {
    // Check if we need to seed the database
    const shouldSeed = process.env.SEED_ON_STARTUP === 'true';
    
    if (shouldSeed) {
      console.log('Seeding database on startup...');
      await tmdbService.seedDatabase();
      
      // Log database seeding
      logSystemEvent('Database seeded', {
        level: 'info',
        details: { seedOnStartup: shouldSeed }
      });
    } else {
      console.log('Database seeding on startup is disabled. Set SEED_ON_STARTUP=true to enable.');
    }
  } catch (error) {
    console.error('Error seeding database on startup:', error.message);
    
    // Log seeding error
    logSystemEvent('Database seeding failed', {
      level: 'error',
      details: { error: error.message }
    });
  }
}

app.use('/auth', authRoutes);
app.use('/profiles', profileRoutes);
app.use('/media', mediaRoutes);
app.use('/reviews', reviewRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Log unhandled errors
  logSystemEvent('Unhandled server error', {
    level: 'error',
    details: { 
      error: err.message,
      stack: err.stack
    },
    ip: req.ip
  });
  
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
  
  // Log server start
  logSystemEvent('Server started', {
    level: 'info',
    details: { port: PORT }
  });
});
