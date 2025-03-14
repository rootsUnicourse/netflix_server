const User = require('../models/User');

// Add a new profile
exports.addProfile = async (req, res) => {
    const { userId } = req.user;
    const { name, avatar } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.profiles.length >= 5) {
            return res.status(400).json({ message: 'Max 5 profiles allowed' });
        }

        user.profiles.push({ name, avatar });
        await user.save();
        res.json(user.profiles);
    } catch (error) {
        res.status(500).json({ message: 'Error adding profile', error });
    }
};

// Delete a profile
exports.deleteProfile = async (req, res) => {
    const { userId } = req.user;
    const { profileId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.profiles = user.profiles.filter(profile => profile._id.toString() !== profileId);
        await user.save();
        res.json({ message: 'Profile deleted', profiles: user.profiles });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting profile', error });
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
        res.status(500).json({ message: 'Error fetching profiles', error });
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

        const profile = user.profiles.find(p => p._id.toString() === profileId);
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        profile.name = name;
        await user.save();
        res.json(user.profiles);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error });
    }
};
