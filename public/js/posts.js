/**
 * SocialApp Posts Manager
 * Handles creating posts, feeds rendering, like/bookmark actions, and interactions
 */

const PostsManager = {
  currentFeed: 'for-you',
  activeTag: null,
  activeSearch: null,
  selectedImageUrl: '',

  init() {
    this.bindComposerEvents();
    this.bindFeedTabs();
  },

  bindComposerEvents() {
    const textarea = document.getElementById('composer-textarea');
    const charCounter = document.getElementById('char-counter');
    const btnPost = document.getElementById('btn-publish-post');
    const mediaPreview = document.getElementById('composer-media-preview');
    const previewImg = document.getElementById('composer-preview-img');
    const btnRemoveMedia = document.getElementById('composer-media-remove');
    const btnAddImage = document.getElementById('btn-composer-image');
    const btnAddTag = document.getElementById('btn-composer-tag');
    const extrasDrawer = document.getElementById('composer-extras-drawer');

    if (!textarea) return;

    // Auto-resize textarea and count characters
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`;

      const len = textarea.value.length;
      charCounter.textContent = `${len}/280`;

      if (len > 250 && len <= 280) {
        charCounter.className = 'char-counter near-limit';
      } else if (len > 280) {
        charCounter.className = 'char-counter over-limit';
        btnPost.disabled = true;
      } else {
        charCounter.className = 'char-counter';
        btnPost.disabled = len === 0 && !this.selectedImageUrl;
      }
    });

    // Toggle extras drawer (presets & tags)
    if (btnAddImage || btnAddTag) {
      const toggleDrawer = () => {
        const isHidden = extrasDrawer.style.display === 'none' || !extrasDrawer.style.display;
        extrasDrawer.style.display = isHidden ? 'flex' : 'none';
      };
      if (btnAddImage) btnAddImage.addEventListener('click', toggleDrawer);
      if (btnAddTag) btnAddTag.addEventListener('click', toggleDrawer);
    }

    // Image preset selection
    document.querySelectorAll('.img-preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const url = pill.dataset.img;
        this.setComposerImage(url);
      });
    });

    // Custom image URL prompt
    const btnCustomImg = document.getElementById('btn-custom-image-url');
    if (btnCustomImg) {
      btnCustomImg.addEventListener('click', () => {
        const url = prompt('Enter an image URL:');
        if (url && url.trim().startsWith('http')) {
          this.setComposerImage(url.trim());
        }
      });
    }

    // Remove attached image
    if (btnRemoveMedia) {
      btnRemoveMedia.addEventListener('click', () => {
        this.selectedImageUrl = '';
        mediaPreview.style.display = 'none';
        previewImg.src = '';
        btnPost.disabled = textarea.value.trim().length === 0;
      });
    }

    // Tag pills in composer
    document.querySelectorAll('.composer-tag-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const tag = pill.dataset.tag;
        if (!textarea.value.includes(`#${tag}`)) {
          textarea.value = `${textarea.value.trim()} #${tag} `;
          textarea.dispatchEvent(new Event('input'));
        }
      });
    });

    // Publish post
    btnPost.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content && !this.selectedImageUrl) return;

      if (!window.AuthManager.isAuthenticated()) {
        window.PulseApp.openModal('auth-modal');
        return;
      }

      btnPost.disabled = true;
      btnPost.textContent = 'Posting...';

      try {
        await window.api.createPost({
          content,
          image_url: this.selectedImageUrl
        });

        // Reset composer
        textarea.value = '';
        textarea.style.height = '80px';
        charCounter.textContent = '0/280';
        this.selectedImageUrl = '';
        mediaPreview.style.display = 'none';
        previewImg.src = '';
        extrasDrawer.style.display = 'none';

        window.PulseApp.showToast('Post published to SocialApp! 🚀', 'success');
        this.loadFeed(this.currentFeed);
      } catch (err) {
        window.PulseApp.showToast(err.message, 'error');
      } finally {
        btnPost.disabled = false;
        btnPost.textContent = 'Post';
      }
    });
  },

  setComposerImage(url) {
    this.selectedImageUrl = url;
    const mediaPreview = document.getElementById('composer-media-preview');
    const previewImg = document.getElementById('composer-preview-img');
    const btnPost = document.getElementById('btn-publish-post');

    previewImg.src = url;
    mediaPreview.style.display = 'block';
    btnPost.disabled = false;
  },

  bindFeedTabs() {
    const tabs = document.querySelectorAll('.feed-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFeed = tab.dataset.feed;
        this.activeTag = null;
        this.activeSearch = null;
        this.loadFeed(this.currentFeed);
      });
    });
  },

  async loadFeed(feedType = 'for-you', filters = {}) {
    const container = document.getElementById('posts-stream-container');
    if (!container) return;

    this.renderSkeletons(container);

    try {
      const params = { feed: feedType, ...filters };
      if (this.activeTag) params.tag = this.activeTag;
      if (this.activeSearch) params.search = this.activeSearch;

      const posts = await window.api.getPosts(params);
      this.renderPosts(posts, container);
    } catch (err) {
      container.innerHTML = `
        <div style="padding:3rem 1.5rem; text-align:center; color:var(--text-muted);">
          <i class="fas fa-exclamation-circle" style="font-size:2rem; margin-bottom:0.75rem; color:var(--danger);"></i>
          <p style="font-size:1.05rem; font-weight:600; color:var(--text-primary); margin-bottom:0.35rem;">Could not load posts</p>
          <p style="font-size:0.9rem;">${err.message}</p>
        </div>
      `;
    }
  },

  renderSkeletons(container) {
    container.innerHTML = Array(3).fill(0).map(() => `
      <div class="post-card" style="opacity:0.7;">
        <div class="skeleton" style="width:44px; height:44px; border-radius:50%; flex-shrink:0;"></div>
        <div style="flex:1; display:flex; flex-direction:column; gap:0.6rem;">
          <div class="skeleton" style="width:140px; height:16px;"></div>
          <div class="skeleton" style="width:90%; height:14px;"></div>
          <div class="skeleton" style="width:60%; height:14px;"></div>
        </div>
      </div>
    `).join('');
  },

  renderPosts(posts, container) {
    if (!posts || posts.length === 0) {
      let emptyMsg = "No posts found in this feed yet.";
      if (this.currentFeed === 'following') {
        emptyMsg = "You aren't following anyone with posts yet. Check 'Explore' or follow suggested creators on the right!";
      } else if (this.currentFeed === 'bookmarks') {
        emptyMsg = "No saved posts yet. Click the bookmark icon on any post to save it for later!";
      } else if (this.activeTag) {
        emptyMsg = `No posts tagged with #${this.activeTag} yet.`;
      }

      container.innerHTML = `
        <div style="padding:4rem 2rem; text-align:center; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:1rem;">📡</div>
          <h3 style="font-size:1.15rem; color:var(--text-primary); margin-bottom:0.4rem; font-weight:700;">Quiet around here</h3>
          <p style="font-size:0.92rem; max-width:360px; margin:0 auto;">${emptyMsg}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map(post => this.createPostCardHTML(post)).join('');
    this.bindPostInteractions(container);
  },

  formatTime(dateString) {
    try {
      const date = new Date(dateString.replace(' ', 'T') + 'Z');
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  },

  formatContent(text) {
    if (!text) return '';
    // Escape HTML first
    const div = document.createElement('div');
    div.innerText = text;
    let safe = div.innerHTML;

    // Highlight Hashtags
    safe = safe.replace(/#(\w+)/g, '<span class="post-hashtag" data-tag="$1">#$1</span>');
    // Highlight Mentions
    safe = safe.replace(/@(\w+)/g, '<span class="post-hashtag" data-user="$1">@$1</span>');
    return safe;
  },

  createPostCardHTML(post) {
    const timeFormatted = this.formatTime(post.created_at);
    const contentFormatted = this.formatContent(post.content);

    return `
      <article class="post-card fade-in" id="post-${post.id}" data-id="${post.id}">
        <div class="post-author-avatar-wrap">
          <img src="${post.author_avatar}" class="post-avatar" alt="${post.author_name}" data-username="${post.author_username}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${post.author_username}'">
        </div>
        <div class="post-content-container">
          <div class="post-header">
            <div class="post-author-meta">
              <span class="post-author-name" data-username="${post.author_username}">${post.author_name}</span>
              <span class="post-author-handle" data-username="${post.author_username}">@${post.author_username}</span>
              <span class="post-dot-separator">•</span>
              <span class="post-time">${timeFormatted}</span>
              ${post.tag ? `<span class="post-tag-badge" data-tag="${post.tag}">#${post.tag}</span>` : ''}
            </div>

            <div class="post-options-dropdown">
              <button class="post-options-btn" data-id="${post.id}" title="More options">
                <i class="fas fa-ellipsis-h"></i>
              </button>
              <div class="options-menu" id="menu-${post.id}">
                <button class="options-item btn-copy-link" data-id="${post.id}">
                  <i class="fas fa-link"></i> Copy Link
                </button>
                ${post.is_author ? `
                  <button class="options-item danger btn-delete-post" data-id="${post.id}">
                    <i class="fas fa-trash-alt"></i> Delete Post
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="post-text">${contentFormatted}</div>

          ${post.image_url ? `
            <div class="post-media-frame" data-img="${post.image_url}">
              <img src="${post.image_url}" alt="Post image" loading="lazy">
            </div>
          ` : ''}

          <div class="post-actions">
            <!-- Like -->
            <button class="action-btn like-btn ${post.is_liked ? 'liked' : ''}" data-id="${post.id}">
              <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i>
              <span class="like-count">${post.likes_count}</span>
            </button>

            <!-- Comment -->
            <button class="action-btn comment-btn" data-id="${post.id}">
              <i class="far fa-comment"></i>
              <span class="comment-count">${post.comments_count}</span>
            </button>

            <!-- Bookmark -->
            <button class="action-btn bookmark-btn ${post.is_bookmarked ? 'bookmarked' : ''}" data-id="${post.id}">
              <i class="${post.is_bookmarked ? 'fas' : 'far'} fa-bookmark"></i>
            </button>

            <!-- Share -->
            <button class="action-btn share-btn" data-id="${post.id}">
              <i class="far fa-share-square"></i>
            </button>
          </div>

          <!-- Comments Section (Collapsible) -->
          <div class="comments-section" id="comments-${post.id}">
            <div class="comment-input-box">
              <input type="text" class="comment-input" placeholder="Write a thoughtful reply..." id="comment-input-${post.id}">
              <button class="comment-submit-btn" data-id="${post.id}" title="Send reply">
                <i class="fas fa-paper-plane" style="font-size:0.8rem;"></i>
              </button>
            </div>
            <div class="comments-list" id="comments-list-${post.id}">
              <!-- Comments dynamically rendered here -->
            </div>
          </div>
        </div>
      </article>
    `;
  },

  bindPostInteractions(container) {
    // Like button
    container.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!window.AuthManager.isAuthenticated()) {
          window.PulseApp.openModal('auth-modal');
          return;
        }

        const postId = btn.dataset.id;
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.like-count');
        const isLiked = btn.classList.contains('liked');

        // Optimistic UI update
        btn.classList.toggle('liked');
        icon.className = !isLiked ? 'fas fa-heart' : 'far fa-heart';
        countSpan.textContent = parseInt(countSpan.textContent || '0', 10) + (!isLiked ? 1 : -1);

        try {
          const res = await window.api.toggleLikePost(postId);
          countSpan.textContent = res.likes_count;
        } catch (err) {
          // Revert on error
          btn.classList.toggle('liked');
          icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
          window.PulseApp.showToast(err.message, 'error');
        }
      });
    });

    // Bookmark button
    container.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!window.AuthManager.isAuthenticated()) {
          window.PulseApp.openModal('auth-modal');
          return;
        }

        const postId = btn.dataset.id;
        const icon = btn.querySelector('i');
        const isBookmarked = btn.classList.contains('bookmarked');

        btn.classList.toggle('bookmarked');
        icon.className = !isBookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';

        try {
          const res = await window.api.toggleBookmarkPost(postId);
          window.PulseApp.showToast(res.message, 'info');
        } catch (err) {
          btn.classList.toggle('bookmarked');
          icon.className = isBookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';
          window.PulseApp.showToast(err.message, 'error');
        }
      });
    });

    // Toggle comments section
    container.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.dataset.id;
        window.CommentsManager.toggleComments(postId);
      });
    });

    // Submit comment from post card
    container.querySelectorAll('.comment-submit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.dataset.id;
        const input = document.getElementById(`comment-input-${postId}`);
        if (input && input.value.trim()) {
          window.CommentsManager.submitComment(postId, input.value.trim());
          input.value = '';
        }
      });
    });

    // Enter key submits comment
    container.querySelectorAll('.comment-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const postId = input.id.replace('comment-input-', '');
          if (input.value.trim()) {
            window.CommentsManager.submitComment(postId, input.value.trim());
            input.value = '';
          }
        }
      });
    });

    // Post Options Dropdown
    container.querySelectorAll('.post-options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.dataset.id;
        const menu = document.getElementById(`menu-${postId}`);
        document.querySelectorAll('.options-menu').forEach(m => {
          if (m !== menu) m.classList.remove('open');
        });
        menu.classList.toggle('open');
      });
    });

    // Delete post
    container.querySelectorAll('.btn-delete-post').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = btn.dataset.id;
        if (confirm('Are you sure you want to permanently delete this post?')) {
          try {
            await window.api.deletePost(postId);
            const card = document.getElementById(`post-${postId}`);
            if (card) card.remove();
            window.PulseApp.showToast('Post deleted.', 'info');
          } catch (err) {
            window.PulseApp.showToast(err.message, 'error');
          }
        }
      });
    });

    // Share / Copy Link
    container.querySelectorAll('.share-btn, .btn-copy-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.dataset.id;
        const shareUrl = `${window.location.origin}/#post-${postId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
          window.PulseApp.showToast('Link copied to clipboard! 📋', 'success');
        });
        const menu = document.getElementById(`menu-${postId}`);
        if (menu) menu.classList.remove('open');
      });
    });

    // Image Lightbox zoom
    container.querySelectorAll('.post-media-frame').forEach(frame => {
      frame.addEventListener('click', () => {
        const url = frame.dataset.img;
        window.PulseApp.openLightbox(url);
      });
    });

    // Profile Click Navigation
    container.querySelectorAll('[data-username]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = el.dataset.username;
        window.PulseApp.navigateToProfile(username);
      });
    });

    // Hashtag Filter Click
    container.querySelectorAll('[data-tag]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = el.dataset.tag;
        this.filterByTag(tag);
      });
    });

    // Close options menus when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.options-menu').forEach(m => m.classList.remove('open'));
    });
  },

  filterByTag(tag) {
    this.activeTag = tag;
    this.currentFeed = 'for-you';
    document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
    window.PulseApp.showToast(`Showing posts tagged #${tag}`, 'info');
    this.loadFeed('for-you', { tag });
  }
};

window.PostsManager = PostsManager;
