const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authRequired } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authRequired, async (req, res) => {
  try {
    const notifications = await db.allAsync(
      `SELECT n.id, n.type, n.post_id, n.content, n.is_read, n.created_at,
              u.id as actor_id, u.name as actor_name, u.username as actor_username, u.avatar as actor_avatar
       FROM notifications n
       JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    res.json(notifications.map(n => ({ ...n, is_read: Boolean(n.is_read) })));
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authRequired, async (req, res) => {
  try {
    const row = await db.getAsync(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ unread_count: row ? row.count : 0 });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ unread_count: 0 });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authRequired, async (req, res) => {
  try {
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

module.exports = router;
