const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    watchlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    }]
}, { timestamps: true });

const Profile = mongoose.model('Profile', ProfileSchema);

module.exports = Profile;
