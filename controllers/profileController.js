const Profile = require('../models/Profile');
const User = require('../models/User');

// Add a new profile
exports.addProfile = async (req, res) => {
    const { userId } = req.user;
    const { name, avatar } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if max profiles reached
        if (user.profiles.length >= 5) {
            return res.status(400).json({ message: 'Maximum of 5 profiles allowed' });
        }

        // Add new profile
        user.profiles.push({ name, avatar, watchlist: [] });
        await user.save();
        
        res.json(user.profiles);
    } catch (error) {
        console.error('Error adding profile:', error);
        res.status(500).json({ message: 'Error adding profile', error: error.message });
    }
};

// Delete a profile
exports.deleteProfile = async (req, res) => {
    const { userId } = req.user;
    const { profileId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Filter out the profile to delete
        user.profiles = user.profiles.filter(profile => profile._id.toString() !== profileId);
        await user.save();
        
        res.json({ message: 'Profile deleted', profiles: user.profiles });
    } catch (error) {
        console.error('Error deleting profile:', error);
        res.status(500).json({ message: 'Error deleting profile', error: error.message });
    }
};

// Get user profiles
exports.getProfiles = async (req, res) => {
    const { userId } = req.user;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user.profiles);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ message: 'Error fetching profiles', error: error.message });
    }
};

// Update profile name
exports.updateProfileName = async (req, res) => {
    const { userId } = req.user;
    const { profileId } = req.params;
    const { name } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Find the profile to update
        const profile = user.profiles.id(profileId);
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        // Update profile name
        profile.name = name;
        await user.save();
        
        res.json(user.profiles);
    } catch (error) {
        console.error('Error updating profile name:', error);
        res.status(500).json({ message: 'Error updating profile name', error: error.message });
    }
};

// Add media to profile's watchlist
exports.addToWatchlist = async (req, res) => {
  try {
    console.log('Adding to watchlist - User info from token:', req.user);
    console.log('Adding to watchlist - Request body:', req.body);
    
    const { mediaId, profileId } = req.body;
    
    if (!mediaId || !profileId) {
      console.log('Missing required fields:', { mediaId, profileId });
      return res.status(400).json({ message: 'Media ID and Profile ID are required' });
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the specific profile
    const profile = user.profiles.id(profileId);
    if (!profile) {
      console.log('Profile not found with ID:', profileId);
      console.log('Available profiles:', user.profiles.map(p => p._id));
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    
    // Initialize watchlist array if it doesn't exist
    if (!profile.watchlist) {
      console.log('Initializing empty watchlist for profile');
      profile.watchlist = [];
    }
    
    // Check if media is already in watchlist to avoid duplicates
    const isAlreadyInWatchlist = profile.watchlist.some(id => id.toString() === mediaId);
    console.log('Media already in watchlist?', isAlreadyInWatchlist);
    
    if (isAlreadyInWatchlist) {
      return res.status(400).json({ message: 'Media already in watchlist' });
    }
    
    // Add to watchlist
    profile.watchlist.push(mediaId);
    await user.save();
    
    console.log('Media added to watchlist. New watchlist size:', profile.watchlist.length);
    
    // Get the watchlist for this profile with populated media objects
    const Media = require('../models/Media');
    const populatedWatchlist = await Media.find({
      '_id': { $in: profile.watchlist }
    });
    
    res.status(200).json(populatedWatchlist);
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove media from profile's watchlist
exports.removeFromWatchlist = async (req, res) => {
  try {
    console.log('Removing from watchlist - Params:', req.params);
    const { mediaId, profileId } = req.params;
    
    if (!mediaId || !profileId) {
      console.log('Missing required fields:', { mediaId, profileId });
      return res.status(400).json({ message: 'Media ID and Profile ID are required' });
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the specific profile
    const profile = user.profiles.id(profileId);
    if (!profile) {
      console.log('Profile not found with ID:', profileId);
      console.log('Available profiles:', user.profiles.map(p => p._id));
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    
    // Remove from watchlist
    if (profile.watchlist) {
      const originalLength = profile.watchlist.length;
      profile.watchlist = profile.watchlist.filter(id => id.toString() !== mediaId);
    }
    await user.save();
    
    console.log('New watchlist size:', profile.watchlist.length);
    
    // Get the watchlist for this profile with populated media objects
    const Media = require('../models/Media');
    const populatedWatchlist = await Media.find({
      '_id': { $in: profile.watchlist }
    });
    
    res.status(200).json(populatedWatchlist);
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get profile's watchlist
exports.getWatchlist = async (req, res) => {
  try {
    const { profileId } = req.params;
    
    if (!profileId) {
      console.log('Missing profile ID');
      return res.status(400).json({ message: 'Profile ID is required' });
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the specific profile
    const profile = user.profiles.id(profileId);
    if (!profile) {
      console.log('Profile not found with ID:', profileId);
      console.log('Available profiles:', user.profiles.map(p => p._id));
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    
    // Get the watchlist for this profile
    const watchlistIds = profile.watchlist || [];
    
    // Populate the media information
    const Media = require('../models/Media');
    const populatedWatchlist = await Media.find({
      '_id': { $in: watchlistIds }
    });
    
    
    res.status(200).json(populatedWatchlist);
  } catch (error) {
    console.error('Error getting watchlist:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = exports;
