const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const { authRequired, JWT_SECRET } = require('../middleware/auth');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Helper to get user profile with stats
async function getUserWithStats(userId) {
  const user = await db.getAsync(
    'SELECT id, name, username, email, bio, avatar, cover_image, location, website, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (!user) return null;

  const followersCount = await db.getAsync(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
    [userId]
  );
  const followingCount = await db.getAsync(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
    [userId]
  );
  const postsCount = await db.getAsync(
    'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
    [userId]
  );

  return {
    ...user,
    followers_count: followersCount.count,
    following_count: followingCount.count,
    posts_count: postsCount.count
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    let { name, username, email, password, bio, avatar, location, website } = req.body;

    const cleanName = name ? name.trim() : '';
    const cleanUsername = username ? username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '') : '';
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    if (!cleanName || !cleanUsername || !cleanEmail || !password) {
      return res.status(400).json({ error: 'Name, username, email, and password are required.' });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters (letters, numbers, underscores).' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check existing
    const existing = await db.getAsync(
      'SELECT id, username, email FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?',
      [cleanUsername, cleanEmail]
    );

    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername) {
        return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
      }
      return res.status(400).json({ error: 'Email is already registered. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`;

    const result = await db.runAsync(
      `INSERT INTO users (name, username, email, password, bio, avatar, cover_image, location, website)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanName,
        cleanUsername,
        cleanEmail,
        hashedPassword,
        bio ? bio.trim() : 'Digital explorer on greenit ✨',
        defaultAvatar,
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        location ? location.trim() : '',
        website ? website.trim() : ''
      ]
    );

    const userWithStats = await getUserWithStats(result.lastID);
    const token = generateToken(userWithStats);

    res.status(201).json({
      message: 'Account created successfully!',
      user: userWithStats,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Please provide email or username and password.' });
    }

    const queryVal = login.toLowerCase().trim();
    const cleanUsername = queryVal.startsWith('@') ? queryVal.slice(1) : queryVal;
    const sanitizedUsername = cleanUsername.replace(/[^a-z0-9_]/g, '');

    const user = await db.getAsync(
      'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? OR LOWER(username) = ?',
      [queryVal, cleanUsername, sanitizedUsername]
    );

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please check your username/email or sign up.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. (For demo accounts, password is password123)' });
    }

    const userWithStats = await getUserWithStats(user.id);
    const token = generateToken(userWithStats);

    res.json({
      message: 'Logged in successfully!',
      user: userWithStats,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/demo-login - Instant 1-click login for reviewers
router.post('/demo-login', async (req, res) => {
  try {
    const { username } = req.body;
    const targetUsername = username ? username.toLowerCase().trim() : 'alexdev';

    const user = await db.getAsync(
      'SELECT * FROM users WHERE LOWER(username) = ?',
      [targetUsername]
    );

    if (!user) {
      return res.status(404).json({ error: 'Demo user not found.' });
    }

    const userWithStats = await getUserWithStats(user.id);
    const token = generateToken(userWithStats);

    res.json({
      message: `Signed in as demo user ${user.name}!`,
      user: userWithStats,
      token
    });
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Internal server error during demo login.' });
  }
});

// GET /api/auth/demo-users - List pre-seeded users for demo switcher
router.get('/demo-users', async (req, res) => {
  try {
    const demoUsers = await db.allAsync(
      'SELECT id, name, username, bio, avatar, location FROM users LIMIT 5'
    );
    res.json(demoUsers);
  } catch (err) {
    console.error('Error fetching demo users:', err);
    res.status(500).json({ error: 'Failed to load demo accounts.' });
  }
});

// GET /api/auth/me - Current user details
router.get('/me', authRequired, async (req, res) => {
  try {
    const userWithStats = await getUserWithStats(req.user.id);
    if (!userWithStats) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json(userWithStats);
  } catch (err) {
    console.error('Me endpoint error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile data.' });
  }
});

module.exports = router;
