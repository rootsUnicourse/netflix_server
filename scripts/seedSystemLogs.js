require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedSystemLogs();
  })
  .catch((err) => console.error('Error connecting to DB:', err));

// Sample log actions
const sampleActions = [
  'User logged in',
  'User registered',
  'Media added to watchlist',
  'Media removed from watchlist',
  'Profile created',
  'Profile updated',
  'Profile deleted',
  'Review submitted',
  'Review updated',
  'Database seeded',
  'Database connected',
  'Server started',
  'HTTP Request',
  'User logout',
  'Login failed - invalid password',
  'Login failed - user not found',
  'User registration failed - user exists',
  'System logs accessed'
];

// Sample log levels
const logLevels = ['info', 'warning', 'error', 'critical'];

// Sample log details
const sampleDetails = [
  { route: '/auth/login', method: 'POST' },
  { route: '/auth/signup', method: 'POST' },
  { route: '/profiles', method: 'GET' },
  { route: '/media', method: 'GET' },
  { route: '/reviews', method: 'POST' },
  { mongoUri: 'mongodb+srv://[REDACTED]@cluster0.mongodb.net/netflix' },
  { port: 5000 },
  { emailOrPhone: 'user@example.com', role: 'user' },
  { emailOrPhone: 'admin@example.com', role: 'admin' },
  { mediaId: '12345', title: 'Stranger Things' },
  { profileId: '67890', name: 'Profile 1' },
  { error: 'User not authenticated' },
  { error: 'Invalid credentials' },
  { watchlistId: '24680', action: 'add' },
  { reviewId: '13579', rating: 4.5 }
];

// Sample IP addresses
const sampleIPs = [
  '192.168.1.1',
  '10.0.0.1',
  '172.16.0.1',
  '127.0.0.1',
  '192.168.0.100',
  '203.0.113.1',
  '198.51.100.1',
  '8.8.8.8',
  '1.1.1.1'
];

// Function to generate a random date within the last 30 days
function getRandomDate() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  return new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));
}

// Function to get a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seedSystemLogs() {
  try {
    // Clear existing logs
    await SystemLog.deleteMany({});
    console.log('Cleared existing system logs');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users for log seeding`);

    const logs = [];

    // Create 100 random logs
    for (let i = 0; i < 100; i++) {
      const useUserLog = Math.random() > 0.3; // 70% of logs will be user-related
      const action = getRandomItem(sampleActions);
      let level;
      
      // Assign appropriate log levels based on action
      if (action.includes('failed') || action.includes('error')) {
        level = Math.random() > 0.5 ? 'warning' : 'error';
      } else if (action.includes('critical')) {
        level = 'critical';
      } else {
        level = 'info';
      }
      
      // Add user ID to some logs
      let userId = null;
      if (useUserLog && users.length > 0) {
        userId = getRandomItem(users)._id;
      }
      
      const log = new SystemLog({
        action,
        level,
        userId,
        details: getRandomItem(sampleDetails),
        ip: getRandomItem(sampleIPs),
        createdAt: getRandomDate()
      });
      
      logs.push(log);
    }

    // Save all logs
    await SystemLog.insertMany(logs);

    console.log(`Successfully seeded ${logs.length} system logs`);
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding system logs:', error);
    mongoose.connection.close();
  }
} 