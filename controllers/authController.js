// server/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { logSystemEvent } = require('../services/logService');

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
      // Log failed registration attempt
      logSystemEvent('User registration failed - user exists', {
        level: 'warning',
        details: { emailOrPhone },
        ip: req.ip
      });
      
      return res.status(400).json({ message: 'User already exists with that email/phone.' });
    }

    // Create new user with validated role
    const newUser = new User({ emailOrPhone, password, role: role.toLowerCase() });
    await newUser.save();

    // Create JWT token including role information
    const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, {
      expiresIn: '1h',
    });
    
    // Log successful registration
    logSystemEvent('User registered', {
      level: 'info',
      userId: newUser._id,
      details: { 
        emailOrPhone: newUser.emailOrPhone,
        role: newUser.role
      },
      ip: req.ip
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
    
    // Log registration error
    logSystemEvent('User registration error', {
      level: 'error',
      details: { 
        error: error.message,
        emailOrPhone: req.body?.emailOrPhone
      },
      ip: req.ip
    });
    
    res.status(500).json({ message: 'Server error during registration' });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    // Check user
    const user = await User.findOne({ emailOrPhone });
    if (!user) {
      // Log failed login attempt
      logSystemEvent('Login failed - user not found', {
        level: 'warning',
        details: { emailOrPhone },
        ip: req.ip
      });
      
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Log failed login attempt (wrong password)
      logSystemEvent('Login failed - invalid password', {
        level: 'warning',
        userId: user._id,
        details: { emailOrPhone },
        ip: req.ip
      });
      
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: '1h',
    });
    
    // Log successful login
    logSystemEvent('User logged in', {
      level: 'info',
      userId: user._id,
      details: { 
        emailOrPhone: user.emailOrPhone,
        role: user.role
      },
      ip: req.ip
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
    
    // Log login error
    logSystemEvent('Login error', {
      level: 'error',
      details: { 
        error: error.message,
        emailOrPhone: req.body?.emailOrPhone 
      },
      ip: req.ip
    });
    
    res.status(500).json({ message: 'Server error during login' });
  }
};


