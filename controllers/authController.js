// server/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// You might store secret in process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_JWT_KEY';

exports.registerUser = async (req, res) => {
  try {
    let { emailOrPhone, password, role } = req.body;

    // Validate required fields
    if (!emailOrPhone || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Ensure the role is valid
    if (!role || !['admin', 'user'].includes(role.toLowerCase())) {
      role = 'user'; // Default role
    }

    // Check for existing user (email or phone should be unique)
    const existingUser = await User.findOne({ emailOrPhone });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with that email/phone.' });
    }

    // Create new user with validated role
    const newUser = new User({ emailOrPhone, password, role: role.toLowerCase() });
    await newUser.save();

    // Create JWT token including role information
    const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        _id: newUser._id,
        emailOrPhone: newUser.emailOrPhone,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    // Check user
    const user = await User.findOne({ emailOrPhone });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        emailOrPhone: user.emailOrPhone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};


