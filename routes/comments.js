const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');

// GET /api/posts/:postId/comments
router.get('/:postId/comments', authOptional, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const currentUserId = req.user ? req.user.id : 0;

    const post = await db.getAsync('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const comments = await db.allAsync(
      `SELECT c.id, c.post_id, c.content, c.created_at,
              u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar,
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count,
              EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as is_liked,
              (c.user_id = ?) as is_author,
              (? = ?) as is_post_owner
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [currentUserId, currentUserId, currentUserId, post.user_id, postId]
    );

    res.json(comments.map(c => ({
      ...c,
      is_liked: Boolean(c.is_liked),
      is_author: Boolean(c.is_author),
      can_delete: Boolean(c.is_author || (currentUserId && currentUserId === post.user_id))
    })));
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to load comments.' });
  }
});

// POST /api/posts/:postId/comments - Add comment
router.post('/:postId/comments', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }

    const post = await db.getAsync('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const result = await db.runAsync(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, req.user.id, content.trim()]
    );

    // Create notification if commenting on someone else's post
    if (post.user_id !== req.user.id) {
      await db.runAsync(
        `INSERT INTO notifications (user_id, actor_id, type, post_id, content)
         VALUES (?, ?, 'comment', ?, 'commented on your post')`,
        [post.user_id, req.user.id, postId]
      );
    }

    const newComment = await db.getAsync(
      `SELECT c.id, c.post_id, c.content, c.created_at,
              u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar,
              0 as likes_count,
              0 as is_liked,
              1 as is_author,
              1 as can_delete
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.lastID]
    );

    const commentsCountRow = await db.getAsync(
      'SELECT COUNT(*) as count FROM comments WHERE post_id = ?',
      [postId]
    );

    res.status(201).json({
      message: 'Comment posted!',
      comment: {
        ...newComment,
        is_liked: false,
        is_author: true,
        can_delete: true
      },
      comments_count: commentsCountRow.count
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// DELETE /api/comments/:id
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const comment = await db.getAsync(
      `SELECT c.id, c.post_id, c.user_id, p.user_id as post_owner_id
       FROM comments c
       JOIN posts p ON c.post_id = p.id
       WHERE c.id = ?`,
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    if (comment.user_id !== req.user.id && comment.post_owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment.' });
    }

    await db.runAsync('DELETE FROM comments WHERE id = ?', [commentId]);

    const commentsCountRow = await db.getAsync(
      'SELECT COUNT(*) as count FROM comments WHERE post_id = ?',
      [comment.post_id]
    );

    res.json({
      message: 'Comment deleted successfully.',
      comments_count: commentsCountRow.count,
      post_id: comment.post_id
    });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

// POST /api/comments/:id/like - Toggle comment like
router.post('/:id/like', authRequired, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    const comment = await db.getAsync('SELECT id FROM comments WHERE id = ?', [commentId]);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const existing = await db.getAsync(
      'SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?',
      [currentUserId, commentId]
    );

    let liked = false;
    if (existing) {
      await db.runAsync('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?', [currentUserId, commentId]);
      liked = false;
    } else {
      await db.runAsync('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)', [currentUserId, commentId]);
      liked = true;
    }

    const likesCountRow = await db.getAsync(
      'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?',
      [commentId]
    );

    res.json({
      liked,
      likes_count: likesCountRow.count
    });
  } catch (err) {
    console.error('Error toggling comment like:', err);
    res.status(500).json({ error: 'Failed to update comment like.' });
  }
});

module.exports = router;
