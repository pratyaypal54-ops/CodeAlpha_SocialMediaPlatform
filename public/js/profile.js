/**
 * SocialApp Profile Manager
 * Handles user profiles, follow/unfollow mechanics, edit profile, and follower lists
 */

const ProfileManager = {
  currentUsername: null,
  profileData: null,
  profileFeedTab: 'posts',

  init() {
    this.bindEditProfileForm();
  },

  async loadProfile(username) {
    this.currentUsername = username;
    const streamContainer = document.getElementById('main-stream-area');
    const profileView = document.getElementById('profile-view-container');
    const feedHeader = document.getElementById('feed-stream-header');
    const composerBox = document.getElementById('composer-box');
    const feedTabs = document.getElementById('feed-tabs-bar');

    // Switch views
    feedHeader.style.display = 'none';
    composerBox.style.display = 'none';
    feedTabs.style.display = 'none';
    profileView.style.display = 'flex';

    profileView.innerHTML = `
      <div style="padding:4rem; text-align:center; color:var(--text-muted);">
        <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:1rem; color:var(--accent-primary);"></i>
        <p>Loading profile...</p>
      </div>
    `;

    try {
      const user = await window.api.getProfile(username);
      this.profileData = user;
      this.renderProfile(user, profileView);
      this.loadUserPosts(user.username, 'posts');
    } catch (err) {
      profileView.innerHTML = `
        <div style="padding:4rem; text-align:center; color:var(--text-muted);">
          <i class="fas fa-user-slash" style="font-size:2.5rem; color:var(--danger); margin-bottom:1rem;"></i>
          <h3>User not found</h3>
          <p>${err.message}</p>
          <button class="btn-profile-back" onclick="window.PulseApp.navigateBackToFeed()" style="margin:1.5rem auto; display:flex;">
            Return to Feed
          </button>
        </div>
      `;
    }
  },

  renderProfile(user, container) {
    const isSelf = user.is_self;
    const isFollowing = user.is_following;

    container.innerHTML = `
      <!-- Top Sticky Header -->
      <div class="profile-top-bar">
        <button class="btn-profile-back" id="btn-back-to-feed" title="Back to Feed">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="profile-title-wrap">
          <span class="profile-title-name">${user.name}</span>
          <span class="profile-title-posts">${user.posts_count} posts</span>
        </div>
      </div>

      <!-- Cover Banner -->
      <div class="profile-cover-banner">
        ${user.cover_image ? `<img src="${user.cover_image}" alt="Cover">` : ''}
      </div>

      <!-- Profile Header Content -->
      <div class="profile-header-content">
        <div class="profile-actions-row">
          <img src="${user.avatar}" class="profile-avatar-large" alt="${user.name}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}'">
          <div class="profile-buttons">
            ${isSelf ? `
              <button class="btn-edit-profile" id="btn-open-edit-profile">
                <i class="fas fa-edit"></i> Edit Profile
              </button>
            ` : `
              <button class="btn-follow-main ${isFollowing ? 'following' : ''}" id="btn-profile-follow" data-id="${user.id}">
                ${isFollowing ? 'Following' : 'Follow'}
              </button>
            `}
          </div>
        </div>

        <div class="profile-identity">
          <h2 class="profile-display-name">${user.name}</h2>
          <span class="profile-handle">@${user.username}</span>
        </div>

        ${user.bio ? `<p class="profile-bio-text">${window.PostsManager.formatContent(user.bio)}</p>` : ''}

        <div class="profile-meta-info">
          ${user.location ? `
            <div class="profile-meta-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${user.location}</span>
            </div>
          ` : ''}
          ${user.website ? `
            <div class="profile-meta-item">
              <i class="fas fa-link"></i>
              <a href="${user.website}" target="_blank" rel="noopener noreferrer">${user.website.replace(/^https?:\/\//, '')}</a>
            </div>
          ` : ''}
          <div class="profile-meta-item">
            <i class="far fa-calendar-alt"></i>
            <span>Joined ${new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <!-- Follow & Post Stats -->
        <div class="profile-stats-row">
          <div class="profile-stat-box" id="stat-following">
            <span class="profile-stat-val" id="profile-following-count">${user.following_count}</span>
            <span>Following</span>
          </div>
          <div class="profile-stat-box" id="stat-followers">
            <span class="profile-stat-val" id="profile-followers-count">${user.followers_count}</span>
            <span>Followers</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-val">${user.likes_received_count || 0}</span>
            <span>Likes</span>
          </div>
        </div>
      </div>

      <!-- Profile Sub-tabs -->
      <div class="feed-tabs" style="background:transparent;">
        <div class="feed-tab active" data-ptab="posts">Posts (${user.posts_count})</div>
        <div class="feed-tab" data-ptab="media">Media</div>
      </div>

      <!-- Profile Posts Container -->
      <div id="profile-posts-container" class="posts-feed">
        <!-- Rendered dynamically -->
      </div>
    `;

    // Back to feed
    document.getElementById('btn-back-to-feed').addEventListener('click', () => {
      window.PulseApp.navigateBackToFeed();
    });

    // Follow toggle
    const btnFollow = document.getElementById('btn-profile-follow');
    if (btnFollow) {
      btnFollow.addEventListener('click', async () => {
        if (!window.AuthManager.isAuthenticated()) {
          window.PulseApp.openModal('auth-modal');
          return;
        }

        const isCurrentlyFollowing = btnFollow.classList.contains('following');
        btnFollow.classList.toggle('following');
        btnFollow.textContent = !isCurrentlyFollowing ? 'Following' : 'Follow';

        const countSpan = document.getElementById('profile-followers-count');
        let currentCount = parseInt(countSpan.textContent || '0', 10);
        countSpan.textContent = !isCurrentlyFollowing ? currentCount + 1 : Math.max(0, currentCount - 1);

        try {
          const res = await window.api.toggleFollow(user.id);
          countSpan.textContent = res.followers_count;
          window.PulseApp.showToast(res.message, 'success');
          // Update suggested list on right sidebar
          window.PulseApp.loadSuggestedUsers();
        } catch (err) {
          // Revert
          btnFollow.classList.toggle('following');
          btnFollow.textContent = isCurrentlyFollowing ? 'Following' : 'Follow';
          countSpan.textContent = currentCount;
          window.PulseApp.showToast(err.message, 'error');
        }
      });
    }

    // Edit profile trigger
    const btnEdit = document.getElementById('btn-open-edit-profile');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        this.openEditProfileModal(user);
      });
    }

    // Followers / Following modals
    document.getElementById('stat-followers').addEventListener('click', () => {
      this.openUserListModal(user.id, 'followers', `${user.name}'s Followers`);
    });

    document.getElementById('stat-following').addEventListener('click', () => {
      this.openUserListModal(user.id, 'following', `Following by ${user.name}`);
    });

    // Profile tabs
    container.querySelectorAll('[data-ptab]').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('[data-ptab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.ptab;
        this.loadUserPosts(user.username, tabName);
      });
    });
  },

  async loadUserPosts(username, tab = 'posts') {
    const container = document.getElementById('profile-posts-container');
    if (!container) return;

    window.PostsManager.renderSkeletons(container);

    try {
      const posts = await window.api.getPosts({ username });
      let filtered = posts;
      if (tab === 'media') {
        filtered = posts.filter(p => p.image_url && p.image_url.trim().length > 0);
      }
      window.PostsManager.renderPosts(filtered, container);
    } catch (err) {
      container.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--danger);">${err.message}</div>`;
    }
  },

  openEditProfileModal(user) {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-bio').value = user.bio || '';
    document.getElementById('edit-avatar').value = user.avatar || '';
    document.getElementById('edit-cover').value = user.cover_image || '';
    document.getElementById('edit-location').value = user.location || '';
    document.getElementById('edit-website').value = user.website || '';

    window.PulseApp.openModal('edit-profile-modal');
  },

  bindEditProfileForm() {
    const form = document.getElementById('form-edit-profile');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-name').value.trim();
      const bio = document.getElementById('edit-bio').value.trim();
      const avatar = document.getElementById('edit-avatar').value.trim();
      const cover_image = document.getElementById('edit-cover').value.trim();
      const location = document.getElementById('edit-location').value.trim();
      const website = document.getElementById('edit-website').value.trim();

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await window.api.updateProfile({
          name,
          bio,
          avatar,
          cover_image,
          location,
          website
        });

        window.AuthManager.setCurrentUser(res.user);
        window.PulseApp.closeModal('edit-profile-modal');
        window.PulseApp.showToast('Profile updated successfully!', 'success');

        // Refresh profile view
        if (this.currentUsername === res.user.username) {
          this.loadProfile(res.user.username);
        }
      } catch (err) {
        window.PulseApp.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    });

    // Preset avatar selector buttons inside edit modal
    document.querySelectorAll('.avatar-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        document.getElementById('edit-avatar').value = url;
      });
    });
  },

  async openUserListModal(userId, type, title) {
    const modal = document.getElementById('users-list-modal');
    const modalTitle = document.getElementById('users-list-title');
    const listBody = document.getElementById('users-list-body');

    modalTitle.textContent = title;
    listBody.innerHTML = `<div style="padding:2rem; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>`;
    window.PulseApp.openModal('users-list-modal');

    try {
      const users = type === 'followers'
        ? await window.api.getFollowers(userId)
        : await window.api.getFollowing(userId);

      if (!users || users.length === 0) {
        listBody.innerHTML = `<div style="padding:2.5rem; text-align:center; color:var(--text-muted);">No users found.</div>`;
        return;
      }

      const currentAuthUser = window.AuthManager.getUser();

      listBody.innerHTML = users.map(u => `
        <div class="suggested-user-item" style="padding:0.6rem 0; border-bottom:1px solid var(--border-color);">
          <div class="suggested-user-info" data-username="${u.username}">
            <img src="${u.avatar}" class="suggested-avatar" alt="${u.name}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}'">
            <div class="suggested-names">
              <span class="suggested-name">${u.name}</span>
              <span class="suggested-handle">@${u.username}</span>
            </div>
          </div>
          ${currentAuthUser && currentAuthUser.id === u.id ? '' : `
            <button class="btn-follow-compact modal-follow-toggle ${u.is_following ? 'following' : ''}" data-id="${u.id}">
              ${u.is_following ? 'Following' : 'Follow'}
            </button>
          `}
        </div>
      `).join('');

      listBody.querySelectorAll('[data-username]').forEach(el => {
        el.addEventListener('click', () => {
          window.PulseApp.closeModal('users-list-modal');
          window.PulseApp.navigateToProfile(el.dataset.username);
        });
      });

      listBody.querySelectorAll('.modal-follow-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!window.AuthManager.isAuthenticated()) {
            window.PulseApp.openModal('auth-modal');
            return;
          }

          const targetId = btn.dataset.id;
          const isFollowing = btn.classList.contains('following');
          btn.classList.toggle('following');
          btn.textContent = !isFollowing ? 'Following' : 'Follow';

          try {
            await window.api.toggleFollow(targetId);
            window.PulseApp.loadSuggestedUsers();
          } catch (err) {
            btn.classList.toggle('following');
            btn.textContent = isFollowing ? 'Following' : 'Follow';
          }
        });
      });
    } catch (err) {
      listBody.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--danger);">${err.message}</div>`;
    }
  }
};

window.ProfileManager = ProfileManager;
