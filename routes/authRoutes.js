const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { generateToken, generateRefreshToken, verifyToken } = require('../middleware/authMiddleware');

// Verify Token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ valid: false, message: 'Invalid token' });
    }
    
    // Optionally fetch fresh user data
    const userModel = new User(req.app.locals.db);
    const user = await userModel.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ valid: false, message: 'User not found' });
    }
    
    res.json({ 
      valid: true, 
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ valid: false, message: 'Token verification failed' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userModel = new User(req.app.locals.db);
    const existingUser = await userModel.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const user = await userModel.create({ full_name, email, password, role });
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      token,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }

    const userModel = new User(req.app.locals.db);
    const user = await userModel.findByEmail(email);

    if (!user || !(await userModel.validatePassword(user, password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      token,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
