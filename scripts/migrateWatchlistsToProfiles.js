require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function migrateWatchlistsToProfiles() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find();
    console.log(`Found ${users.length} users to migrate`);

    let successCount = 0;
    let skipCount = 0;

    // Iterate through each user
    for (const user of users) {
      // Check if user has a watchlist property
      if (user.watchlist && user.watchlist.length > 0) {
        console.log(`User ${user.emailOrPhone} has ${user.watchlist.length} items in watchlist`);
        
        // If user has profiles, move watchlist to all profiles
        if (user.profiles && user.profiles.length > 0) {
          for (const profile of user.profiles) {
            // Initialize watchlist array if it doesn't exist
            if (!profile.watchlist) {
              profile.watchlist = [];
            }
            
            // Add all items from user watchlist to profile watchlist
            profile.watchlist = [...new Set([...profile.watchlist, ...user.watchlist])];
          }
          
          // Remove the watchlist field from the user document
          user.watchlist = undefined;
          
          // Save the updated user
          await user.save();
          successCount++;
          console.log(`Successfully migrated watchlist for user ${user.emailOrPhone}`);
        } else {
          console.log(`User ${user.emailOrPhone} has no profiles, skipping`);
          skipCount++;
        }
      } else {
        console.log(`User ${user.emailOrPhone} has no watchlist, skipping`);
        skipCount++;
      }
    }

    console.log(`Migration completed: ${successCount} users migrated, ${skipCount} users skipped`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
migrateWatchlistsToProfiles()
  .then(() => console.log('Migration script finished'))
  .catch(err => console.error('Migration script failed:', err)); 