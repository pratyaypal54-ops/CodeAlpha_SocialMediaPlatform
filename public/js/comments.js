/**
 * SocialApp Comments Manager
 * Handles fetching, posting, liking, and deleting comments on posts
 */

const CommentsManager = {
  async toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (!section) return;

    const isOpen = section.classList.contains('open');
    if (isOpen) {
      section.classList.remove('open');
    } else {
      section.classList.add('open');
      await this.loadComments(postId);
    }
  },

  async loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;

    list.innerHTML = `<div style="padding:0.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> Loading replies...</div>`;

    try {
      const comments = await window.api.getComments(postId);
      this.renderCommentsList(postId, comments, list);
    } catch (err) {
      list.innerHTML = `<div style="padding:0.5rem; color:var(--danger); font-size:0.85rem;">Failed to load comments.</div>`;
    }
  },

  renderCommentsList(postId, comments, listElement) {
    if (!comments || comments.length === 0) {
      listElement.innerHTML = `<div style="padding:0.5rem 0.2rem; color:var(--text-muted); font-size:0.82rem;">No replies yet. Be the first to share your thoughts!</div>`;
      return;
    }

    listElement.innerHTML = comments.map(c => `
      <div class="comment-item fade-in" id="comment-${c.id}">
        <img src="${c.author_avatar}" class="comment-avatar" alt="${c.author_name}" data-username="${c.author_username}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${c.author_username}'">
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author-name" data-username="${c.author_username}">${c.author_name}</span>
            <span class="post-dot-separator">•</span>
            <span class="comment-time">${window.PostsManager.formatTime(c.created_at)}</span>
          </div>
          <div class="comment-text">${window.PostsManager.formatContent(c.content)}</div>
          <div class="comment-actions">
            <button class="comment-action-btn comment-like-btn ${c.is_liked ? 'liked' : ''}" data-id="${c.id}">
              <i class="${c.is_liked ? 'fas' : 'far'} fa-heart"></i>
              <span class="comment-likes-count">${c.likes_count || 0}</span>
            </button>
            ${c.can_delete ? `
              <button class="comment-action-btn delete-btn comment-del-btn" data-id="${c.id}" data-post-id="${postId}">
                <i class="fas fa-trash-alt"></i> Delete
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    // Bind comment likes & deletes & username navigations
    listElement.querySelectorAll('.comment-like-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!window.AuthManager.isAuthenticated()) {
          window.PulseApp.openModal('auth-modal');
          return;
        }

        const commentId = btn.dataset.id;
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.comment-likes-count');
        const isLiked = btn.classList.contains('liked');

        btn.classList.toggle('liked');
        icon.className = !isLiked ? 'fas fa-heart' : 'far fa-heart';
        countSpan.textContent = parseInt(countSpan.textContent || '0', 10) + (!isLiked ? 1 : -1);

        try {
          const res = await window.api.toggleLikeComment(commentId);
          countSpan.textContent = res.likes_count;
        } catch (err) {
          btn.classList.toggle('liked');
          icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
        }
      });
    });

    listElement.querySelectorAll('.comment-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const commentId = btn.dataset.id;
        const pId = btn.dataset.postId;
        if (confirm('Delete this comment?')) {
          try {
            const res = await window.api.deleteComment(commentId);
            const item = document.getElementById(`comment-${commentId}`);
            if (item) item.remove();

            // Update comment count on post card
            const postCard = document.getElementById(`post-${pId}`);
            if (postCard) {
              const countBadge = postCard.querySelector('.comment-count');
              if (countBadge) countBadge.textContent = res.comments_count;
            }
            window.PulseApp.showToast('Comment deleted.', 'info');
          } catch (err) {
            window.PulseApp.showToast(err.message, 'error');
          }
        }
      });
    });

    listElement.querySelectorAll('[data-username]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        window.PulseApp.navigateToProfile(el.dataset.username);
      });
    });
  },

  async submitComment(postId, content) {
    if (!window.AuthManager.isAuthenticated()) {
      window.PulseApp.openModal('auth-modal');
      return;
    }

    try {
      const res = await window.api.addComment(postId, content);
      window.PulseApp.showToast('Reply posted!', 'success');

      // Update post card comment count
      const postCard = document.getElementById(`post-${postId}`);
      if (postCard) {
        const countBadge = postCard.querySelector('.comment-count');
        if (countBadge) countBadge.textContent = res.comments_count;
      }

      // Reload comments list
      await this.loadComments(postId);
    } catch (err) {
      window.PulseApp.showToast(err.message, 'error');
    }
  }
};

window.CommentsManager = CommentsManager;
