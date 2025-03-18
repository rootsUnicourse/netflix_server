const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    avatar: { type: String, required: true },
}, { timestamps: true });

const Profile = mongoose.model('Profile', ProfileSchema);

module.exports = Profile;
