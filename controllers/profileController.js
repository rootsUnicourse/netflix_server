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
        user.profiles.push({ name, avatar });
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
