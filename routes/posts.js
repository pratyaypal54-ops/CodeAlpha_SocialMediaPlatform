const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');

// GET /api/posts/trending/tags - List top hashtags with counts
router.get('/trending/tags', async (req, res) => {
  try {
    const tags = await db.allAsync(
      `SELECT tag, COUNT(*) as post_count
       FROM posts
       WHERE tag IS NOT NULL AND TRIM(tag) != ''
       GROUP BY tag
       ORDER BY post_count DESC
       LIMIT 8`
    );
    res.json(tags);
  } catch (err) {
    console.error('Error fetching trending tags:', err);
    res.status(500).json({ error: 'Failed to fetch trending tags.' });
  }
});

// GET /api/posts - Main feed with filters
router.get('/', authOptional, async (req, res) => {
  try {
    const { feed = 'for-you', tag, search, username, userId } = req.query;
    const currentUserId = req.user ? req.user.id : 0;

    let whereClauses = [];
    let params = [currentUserId, currentUserId, currentUserId, currentUserId];

    if (feed === 'following') {
      if (!currentUserId) {
        return res.status(401).json({ error: 'Please log in to view posts from people you follow.' });
      }
      whereClauses.push(`p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)`);
      params.push(currentUserId);
    } else if (feed === 'bookmarks') {
      if (!currentUserId) {
        return res.status(401).json({ error: 'Please log in to view bookmarks.' });
      }
      whereClauses.push(`p.id IN (SELECT post_id FROM bookmarks WHERE user_id = ?)`);
      params.push(currentUserId);
    } else if (username) {
      whereClauses.push(`LOWER(u.username) = ?`);
      params.push(username.toLowerCase().trim());
    } else if (userId) {
      whereClauses.push(`p.user_id = ?`);
      params.push(parseInt(userId, 10));
    }

    if (tag) {
      whereClauses.push(`LOWER(p.tag) = ? OR LOWER(p.content) LIKE ?`);
      params.push(tag.toLowerCase().trim().replace(/^#/, ''));
      params.push(`%#${tag.toLowerCase().trim().replace(/^#/, '')}%`);
    }

    if (search) {
      whereClauses.push(`(LOWER(p.content) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ?)`);
      const s = `%${search.toLowerCase().trim()}%`;
      params.push(s, s, s);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT p.id, p.content, p.image_url, p.tag, p.created_at,
             u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
             EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked,
             EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.user_id) as is_following_author,
             (p.user_id = ?) as is_author
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT 50
    `;

    const posts = await db.allAsync(query, params);

    res.json(posts.map(p => ({
      ...p,
      is_liked: Boolean(p.is_liked),
      is_bookmarked: Boolean(p.is_bookmarked),
      is_following_author: Boolean(p.is_following_author),
      is_author: Boolean(p.is_author)
    })));
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts feed.' });
  }
});

// POST /api/posts - Create post
router.post('/', authRequired, async (req, res) => {
  try {
    const { content, image_url, tag } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    // Auto extract tag if not provided
    let finalTag = tag ? tag.trim().replace(/^#/, '').toLowerCase() : '';
    if (!finalTag) {
      const match = content.match(/#(\w+)/);
      if (match) {
        finalTag = match[1].toLowerCase();
      }
    }

    const result = await db.runAsync(
      `INSERT INTO posts (user_id, content, image_url, tag)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, content.trim(), image_url ? image_url.trim() : '', finalTag]
    );

    const newPost = await db.getAsync(
      `SELECT p.id, p.content, p.image_url, p.tag, p.created_at,
              u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar,
              0 as likes_count,
              0 as comments_count,
              0 as is_liked,
              0 as is_bookmarked,
              0 as is_following_author,
              1 as is_author
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      message: 'Post created successfully!',
      post: {
        ...newPost,
        is_liked: false,
        is_bookmarked: false,
        is_following_author: false,
        is_author: true
      }
    });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to publish post.' });
  }
});

// GET /api/posts/:id - Single post
router.get('/:id', authOptional, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user ? req.user.id : 0;

    const post = await db.getAsync(
      `SELECT p.id, p.content, p.image_url, p.tag, p.created_at,
              u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
              EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
              EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.user_id) as is_following_author,
              (p.user_id = ?) as is_author
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [currentUserId, currentUserId, currentUserId, currentUserId, postId]
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({
      ...post,
      is_liked: Boolean(post.is_liked),
      is_bookmarked: Boolean(post.is_bookmarked),
      is_following_author: Boolean(post.is_following_author),
      is_author: Boolean(post.is_author)
    });
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Failed to retrieve post.' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post = await db.getAsync('SELECT * FROM posts WHERE id = ?', [postId]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this post.' });
    }

    await db.runAsync('DELETE FROM posts WHERE id = ?', [postId]);

    res.json({ message: 'Post deleted successfully!' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// POST /api/posts/:id/like - Toggle like on post
router.post('/:id/like', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    const post = await db.getAsync('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existingLike = await db.getAsync(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
      [currentUserId, postId]
    );

    let liked = false;
    if (existingLike) {
      // Unlike
      await db.runAsync('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [currentUserId, postId]);
      liked = false;
    } else {
      // Like
      await db.runAsync('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [currentUserId, postId]);
      liked = true;

      // Create notification if liking someone else's post
      if (post.user_id !== currentUserId) {
        await db.runAsync(
          `INSERT INTO notifications (user_id, actor_id, type, post_id, content)
           VALUES (?, ?, 'like', ?, 'liked your post')`,
          [post.user_id, currentUserId, postId]
        );
      }
    }

    const likesCountRow = await db.getAsync(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
      [postId]
    );

    res.json({
      liked,
      likes_count: likesCountRow.count
    });
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ error: 'Failed to update like status.' });
  }
});

// POST /api/posts/:id/bookmark - Toggle bookmark
router.post('/:id/bookmark', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    const post = await db.getAsync('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existingBookmark = await db.getAsync(
      'SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?',
      [currentUserId, postId]
    );

    let bookmarked = false;
    if (existingBookmark) {
      await db.runAsync('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?', [currentUserId, postId]);
      bookmarked = false;
    } else {
      await db.runAsync('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)', [currentUserId, postId]);
      bookmarked = true;
    }

    res.json({
      bookmarked,
      message: bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks'
    });
  } catch (err) {
    console.error('Error bookmarking post:', err);
    res.status(500).json({ error: 'Failed to bookmark post.' });
  }
});

module.exports = router;
