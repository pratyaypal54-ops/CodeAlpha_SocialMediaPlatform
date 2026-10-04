const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'Demo_pulse_social_jwt_secret_key_2026_super_secure!';

async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await db.getAsync(
      'SELECT id, name, username, email, bio, avatar, cover_image, location, website, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

async function authOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.getAsync(
        'SELECT id, name, username, email, bio, avatar, cover_image, location, website, created_at FROM users WHERE id = ?',
        [decoded.id]
      );
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore invalid token on optional auth
    req.user = null;
  }
  next();
}

module.exports = {
  authRequired,
  authOptional,
  JWT_SECRET
};
