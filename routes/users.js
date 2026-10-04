const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');

// GET /api/users/search?q=...
router.get('/search', authOptional, async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q) {
      return res.json([]);
    }

    const currentUserId = req.user ? req.user.id : 0;
    const users = await db.allAsync(
      `SELECT u.id, u.name, u.username, u.avatar, u.bio,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
       FROM users u
       WHERE (LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ?)
       LIMIT 10`,
      [currentUserId, `%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`]
    );

    res.json(users.map(u => ({ ...u, is_following: Boolean(u.is_following) })));
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

// GET /api/users/suggested
router.get('/suggested', authOptional, async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 0;

    const suggested = await db.allAsync(
      `SELECT u.id, u.name, u.username, u.avatar, u.bio,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
       FROM users u
       WHERE u.id != ?
         AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY followers_count DESC, u.id ASC
       LIMIT 5`,
      [currentUserId, currentUserId, currentUserId]
    );

    res.json(suggested.map(u => ({ ...u, is_following: Boolean(u.is_following) })));
  } catch (err) {
    console.error('Error fetching suggested users:', err);
    res.status(500).json({ error: 'Failed to fetch suggestions.' });
  }
});

// GET /api/users/profile/:username
router.get('/profile/:username', authOptional, async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    const user = await db.getAsync(
      'SELECT id, name, username, bio, avatar, cover_image, location, website, created_at FROM users WHERE LOWER(username) = ?',
      [username]
    );

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const currentUserId = req.user ? req.user.id : 0;

    const followersRow = await db.getAsync(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [user.id]
    );
    const followingRow = await db.getAsync(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      [user.id]
    );
    const postsRow = await db.getAsync(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
      [user.id]
    );
    const likesReceivedRow = await db.getAsync(
      `SELECT COUNT(*) as count FROM likes l
       JOIN posts p ON l.post_id = p.id
       WHERE p.user_id = ?`,
      [user.id]
    );

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const followCheck = await db.getAsync(
        'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
        [currentUserId, user.id]
      );
      isFollowing = Boolean(followCheck);
    }

    res.json({
      ...user,
      followers_count: followersRow.count,
      following_count: followingRow.count,
      posts_count: postsRow.count,
      likes_received_count: likesReceivedRow.count,
      is_following: isFollowing,
      is_self: currentUserId === user.id
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// PUT /api/users/profile - Update current user profile
router.put('/profile', authRequired, async (req, res) => {
  try {
    const { name, bio, avatar, cover_image, location, website } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }

    await db.runAsync(
      `UPDATE users
       SET name = ?, bio = ?, avatar = ?, cover_image = ?, location = ?, website = ?
       WHERE id = ?`,
      [
        name.trim(),
        bio !== undefined ? bio.trim() : req.user.bio,
        avatar !== undefined ? avatar.trim() : req.user.avatar,
        cover_image !== undefined ? cover_image.trim() : req.user.cover_image,
        location !== undefined ? location.trim() : req.user.location,
        website !== undefined ? website.trim() : req.user.website,
        req.user.id
      ]
    );

    const updatedUser = await db.getAsync(
      'SELECT id, name, username, email, bio, avatar, cover_image, location, website, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Profile updated successfully!',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/users/:id/follow - Toggle follow / unfollow
router.post('/:id/follow', authRequired, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const targetUser = await db.getAsync('SELECT id, name, username FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User does not exist.' });
    }

    const existingFollow = await db.getAsync(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [currentUserId, targetUserId]
    );

    let following = false;
    if (existingFollow) {
      // Unfollow
      await db.runAsync(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [currentUserId, targetUserId]
      );
      following = false;
    } else {
      // Follow
      await db.runAsync(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [currentUserId, targetUserId]
      );
      following = true;

      // Create notification
      await db.runAsync(
        `INSERT INTO notifications (user_id, actor_id, type, content)
         VALUES (?, ?, 'follow', 'started following you')`,
        [targetUserId, currentUserId]
      );
    }

    const followersCountRow = await db.getAsync(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [targetUserId]
    );

    res.json({
      following,
      followers_count: followersCountRow.count,
      message: following ? `You are now following ${targetUser.name}` : `Unfollowed ${targetUser.name}`
    });
  } catch (err) {
    console.error('Error toggling follow:', err);
    res.status(500).json({ error: 'Failed to update follow status.' });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', authOptional, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.user ? req.user.id : 0;

    const followers = await db.allAsync(
      `SELECT u.id, u.name, u.username, u.avatar, u.bio,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
      [currentUserId, targetUserId]
    );

    res.json(followers.map(f => ({ ...f, is_following: Boolean(f.is_following) })));
  } catch (err) {
    console.error('Error fetching followers:', err);
    res.status(500).json({ error: 'Failed to get followers list.' });
  }
});

// GET /api/users/:id/following
router.get('/:id/following', authOptional, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.user ? req.user.id : 0;

    const following = await db.allAsync(
      `SELECT u.id, u.name, u.username, u.avatar, u.bio,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
      [currentUserId, targetUserId]
    );

    res.json(following.map(f => ({ ...f, is_following: Boolean(f.is_following) })));
  } catch (err) {
    console.error('Error fetching following:', err);
    res.status(500).json({ error: 'Failed to get following list.' });
  }
});

module.exports = router;
