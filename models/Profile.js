const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    avatar: { type: String, required: true },
});

module.exports = ProfileSchema;
