// server/models/User.js
const mongoose = require('mongoose');
const Profile = require('./Profile');
const bcrypt = require('bcrypt');

// Get just the schema definition from the Profile model
const ProfileSchema = Profile.schema;

const userSchema = new mongoose.Schema({
  emailOrPhone: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'user', 
    enum: ['user', 'admin']
  },
  profiles: [ProfileSchema],
  watchlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }]
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

// Helper method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
