/**
 * SocialApp Search & Discovery Manager
 * Handles user searches, trending tags widget, and suggested creator recommendations
 */

const SearchManager = {
  searchDebounceTimer: null,

  init() {
    this.bindSearchInput();
    this.loadTrendingTags();
    this.loadSuggestedUsers();
  },

  bindSearchInput() {
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-dropdown');

    if (!input) return;

    input.addEventListener('input', () => {
      clearTimeout(this.searchDebounceTimer);
      const query = input.value.trim();

      if (!query) {
        if (resultsContainer) resultsContainer.style.display = 'none';
        return;
      }

      this.searchDebounceTimer = setTimeout(async () => {
        await this.performSearch(query, resultsContainer);
      }, 250);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query) {
          if (resultsContainer) resultsContainer.style.display = 'none';
          window.PulseApp.navigateBackToFeed();
          window.PostsManager.activeSearch = query;
          window.PostsManager.loadFeed('for-you', { search: query });
          window.PulseApp.showToast(`Search results for "${query}"`, 'info');
        }
      }
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
      if (resultsContainer && !e.target.closest('.search-widget')) {
        resultsContainer.style.display = 'none';
      }
    });
  },

  async performSearch(query, container) {
    if (!container) return;

    try {
      const users = await window.api.searchUsers(query);
      container.style.display = 'block';

      let html = '';

      // Direct hashtag search option
      html += `
        <div class="search-result-item" data-action="tag-search" data-tag="${query.replace(/^#/, '')}">
          <div class="search-tag-icon"><i class="fas fa-hashtag"></i></div>
          <div class="search-result-info">
            <span class="search-result-name">Search posts tagged #${query.replace(/^#/, '')}</span>
          </div>
        </div>
      `;

      if (users && users.length > 0) {
        html += `<div style="padding:0.35rem 0.75rem; font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">People</div>`;
        users.forEach(u => {
          html += `
            <div class="search-result-item" data-action="user" data-username="${u.username}">
              <img src="${u.avatar}" class="search-result-avatar" alt="${u.name}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}'">
              <div class="search-result-info">
                <span class="search-result-name">${u.name}</span>
                <span class="search-result-handle">@${u.username}</span>
              </div>
            </div>
          `;
        });
      }

      container.innerHTML = html;

      // Bind result clicks
      container.querySelectorAll('[data-action]').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action;
          container.style.display = 'none';

          if (action === 'user') {
            window.PulseApp.navigateToProfile(item.dataset.username);
          } else if (action === 'tag-search') {
            const tag = item.dataset.tag;
            window.PulseApp.navigateBackToFeed();
            window.PostsManager.filterByTag(tag);
          }
        });
      });
    } catch (err) {
      console.warn('Search query error:', err);
    }
  },

  async loadTrendingTags() {
    const list = document.getElementById('trending-tags-list');
    if (!list) return;

    try {
      const tags = await window.api.getTrendingTags();
      if (!tags || tags.length === 0) {
        list.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem 0;">No trending topics yet.</div>`;
        return;
      }

      list.innerHTML = tags.map((t, idx) => `
        <div class="trend-item" data-tag="${t.tag}">
          <span class="trend-category">${idx + 1} · Trending in Tech</span>
          <span class="trend-tag">#${t.tag}</span>
          <span class="trend-count">${t.post_count} ${t.post_count === 1 ? 'post' : 'posts'}</span>
        </div>
      `).join('');

      list.querySelectorAll('.trend-item').forEach(item => {
        item.addEventListener('click', () => {
          const tag = item.dataset.tag;
          window.PulseApp.navigateBackToFeed();
          window.PostsManager.filterByTag(tag);
        });
      });
    } catch (err) {
      console.warn('Error loading trending tags:', err);
    }
  },

  async loadSuggestedUsers() {
    const list = document.getElementById('suggested-users-list');
    if (!list) return;

    try {
      const users = await window.api.getSuggestedUsers();
      if (!users || users.length === 0) {
        list.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem 0;">You are following all featured creators! ✨</div>`;
        return;
      }

      list.innerHTML = users.map(u => `
        <div class="suggested-user-item">
          <div class="suggested-user-info" data-username="${u.username}">
            <img src="${u.avatar}" class="suggested-avatar" alt="${u.name}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}'">
            <div class="suggested-names">
              <span class="suggested-name">${u.name}</span>
              <span class="suggested-handle">@${u.username}</span>
            </div>
          </div>
          <button class="btn-follow-compact suggested-follow-btn ${u.is_following ? 'following' : ''}" data-id="${u.id}" data-name="${u.name}">
            ${u.is_following ? 'Following' : 'Follow'}
          </button>
        </div>
      `).join('');

      // Bind username navigations
      list.querySelectorAll('.suggested-user-info').forEach(info => {
        info.addEventListener('click', () => {
          window.PulseApp.navigateToProfile(info.dataset.username);
        });
      });

      // Bind follow toggles
      list.querySelectorAll('.suggested-follow-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!window.AuthManager.isAuthenticated()) {
            window.PulseApp.openModal('auth-modal');
            return;
          }

          const targetId = btn.dataset.id;
          const targetName = btn.dataset.name;
          const isFollowing = btn.classList.contains('following');

          btn.classList.toggle('following');
          btn.textContent = !isFollowing ? 'Following' : 'Follow';

          try {
            const res = await window.api.toggleFollow(targetId);
            window.PulseApp.showToast(res.message, 'success');
          } catch (err) {
            btn.classList.toggle('following');
            btn.textContent = isFollowing ? 'Following' : 'Follow';
            window.PulseApp.showToast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      console.warn('Error loading suggested creators:', err);
    }
  }
};

window.SearchManager = SearchManager;
