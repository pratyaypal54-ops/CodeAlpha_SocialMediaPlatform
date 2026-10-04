/**
 * greenit Main Application Coordinator
 * Handles theme toggles, modal lifecycle, routing, notifications drawer, and toasts
 */

const PulseApp = {
  currentView: 'feed', // 'feed' | 'profile'

  init() {
    this.initTheme();
    this.bindNavigation();
    this.bindModals();
    this.bindNotifications();

    // Initialize modules
    window.AuthManager.init();
    window.PostsManager.init();
    window.ProfileManager.init();
    window.SearchManager.init();

    // Initial feed load
    window.PostsManager.loadFeed('for-you');

    // Handle browser hash navigation (e.g. #@alexdev or #post-1)
    this.handleInitialHash();
  },

  handleInitialHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#@')) {
      const username = hash.slice(2);
      this.navigateToProfile(username);
    }
  },

  /* ---------------------------------------------------------
     Theme System (Dark / Light)
  --------------------------------------------------------- */
  initTheme() {
    const savedTheme = localStorage.getItem('pulse_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('pulse_theme', nextTheme);
        this.updateThemeIcon(nextTheme);
        this.showToast(`Switched to ${nextTheme} mode`, 'info');
      });
    }
  },

  updateThemeIcon(theme) {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;
    toggleBtn.innerHTML = theme === 'light'
      ? '<i class="fas fa-moon"></i>'
      : '<i class="fas fa-sun"></i>';
  },

  /* ---------------------------------------------------------
     Navigation & Routing
  --------------------------------------------------------- */
  bindNavigation() {
    // Brand Logo -> Go Home
    const brand = document.getElementById('brand-link');
    if (brand) {
      brand.addEventListener('click', () => this.navigateBackToFeed());
    }

    // Sidebar Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const nav = item.dataset.nav;
        if (!nav) return;
        e.preventDefault();

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        if (nav === 'home') {
          this.navigateBackToFeed();
          window.PostsManager.currentFeed = 'for-you';
          window.PostsManager.activeTag = null;
          window.PostsManager.activeSearch = null;
          window.PostsManager.loadFeed('for-you');
        } else if (nav === 'explore') {
          this.navigateBackToFeed();
          window.PostsManager.activeTag = null;
          window.PostsManager.activeSearch = null;
          window.PostsManager.loadFeed('for-you');
        } else if (nav === 'notifications') {
          this.openNotificationsModal();
        } else if (nav === 'bookmarks') {
          if (!window.AuthManager.isAuthenticated()) {
            this.openModal('auth-modal');
            return;
          }
          this.navigateBackToFeed();
          window.PostsManager.currentFeed = 'bookmarks';
          document.querySelectorAll('.feed-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.feed === 'bookmarks');
          });
          window.PostsManager.loadFeed('bookmarks');
        } else if (nav === 'profile') {
          if (!window.AuthManager.isAuthenticated()) {
            this.openModal('auth-modal');
            return;
          }
          const user = window.AuthManager.getUser();
          this.navigateToProfile(user.username);
        }
      });
    });

    // Sidebar Quick Post Button
    const btnSidebarPost = document.getElementById('btn-sidebar-post');
    if (btnSidebarPost) {
      btnSidebarPost.addEventListener('click', () => {
        this.navigateBackToFeed();
        const textarea = document.getElementById('composer-textarea');
        if (textarea) {
          textarea.focus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // Mobile Bottom Nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nav = btn.dataset.nav;
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (nav === 'home') {
          this.navigateBackToFeed();
        } else if (nav === 'search') {
          const input = document.getElementById('search-input');
          if (input) input.focus();
        } else if (nav === 'post') {
          this.navigateBackToFeed();
          const textarea = document.getElementById('composer-textarea');
          if (textarea) textarea.focus();
        } else if (nav === 'notifications') {
          this.openNotificationsModal();
        } else if (nav === 'profile') {
          if (!window.AuthManager.isAuthenticated()) {
            this.openModal('auth-modal');
          } else {
            this.navigateToProfile(window.AuthManager.getUser().username);
          }
        }
      });
    });
  },

  navigateToProfile(username) {
    this.currentView = 'profile';
    window.location.hash = `@${username}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.ProfileManager.loadProfile(username);
  },

  navigateBackToFeed() {
    this.currentView = 'feed';
    window.location.hash = '';

    const feedHeader = document.getElementById('feed-stream-header');
    const composerBox = document.getElementById('composer-box');
    const feedTabs = document.getElementById('feed-tabs-bar');
    const profileView = document.getElementById('profile-view-container');

    if (feedHeader) feedHeader.style.display = 'flex';
    if (composerBox && window.AuthManager.isAuthenticated()) composerBox.style.display = 'flex';
    if (feedTabs) feedTabs.style.display = 'flex';
    if (profileView) profileView.style.display = 'none';

    // Highlight Home in sidebar
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.nav === 'home');
    });
  },

  refreshCurrentView() {
    if (this.currentView === 'profile' && window.ProfileManager.currentUsername) {
      window.ProfileManager.loadProfile(window.ProfileManager.currentUsername);
    } else {
      window.PostsManager.loadFeed(window.PostsManager.currentFeed);
    }
    window.AuthManager.updateUI();
    window.SearchManager.loadSuggestedUsers();
  },

  loadSuggestedUsers() {
    window.SearchManager.loadSuggestedUsers();
  },

  /* ---------------------------------------------------------
     Modal Management
  --------------------------------------------------------- */
  bindModals() {
    // Close button in any modal
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      });
    });

    // Close on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
        }
      });
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        this.closeLightbox();
      }
    });

    // Lightbox close button
    const btnLightboxClose = document.getElementById('lightbox-close-btn');
    if (btnLightboxClose) {
      btnLightboxClose.addEventListener('click', () => this.closeLightbox());
    }
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  },

  /* ---------------------------------------------------------
     Account Options Modal (Switch demo accounts, log out)
  --------------------------------------------------------- */
  showAccountOptionsModal() {
    const user = window.AuthManager.getUser();
    if (!user) return;

    this.openModal('account-options-modal');
  },

  /* ---------------------------------------------------------
     Notifications System
  --------------------------------------------------------- */
  bindNotifications() {
    const btnMarkAll = document.getElementById('btn-mark-notifications-read');
    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', async () => {
        try {
          await window.api.markNotificationsRead();
          document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
          });
          const badge = document.getElementById('nav-notifications-badge');
          if (badge) badge.style.display = 'none';
          this.showToast('All notifications marked as read', 'info');
        } catch (e) {
          // ignore
        }
      });
    }
  },

  async openNotificationsModal() {
    if (!window.AuthManager.isAuthenticated()) {
      this.openModal('auth-modal');
      return;
    }

    const modal = document.getElementById('notifications-modal');
    const list = document.getElementById('notifications-list');
    list.innerHTML = `<div style="padding:2.5rem; text-align:center; color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading notifications...</div>`;
    this.openModal('notifications-modal');

    try {
      const notifications = await window.api.getNotifications();
      const badge = document.getElementById('nav-notifications-badge');
      if (badge) badge.style.display = 'none';

      if (!notifications || notifications.length === 0) {
        list.innerHTML = `
          <div style="padding:3rem 1.5rem; text-align:center; color:var(--text-muted);">
            <i class="far fa-bell" style="font-size:2.5rem; margin-bottom:0.75rem; opacity:0.6;"></i>
            <p>You have no notifications yet.</p>
          </div>
        `;
        return;
      }

      list.innerHTML = notifications.map(n => {
        let iconHtml = '<i class="fas fa-bell" style="color:var(--accent-primary);"></i>';
        if (n.type === 'like') iconHtml = '<i class="fas fa-heart" style="color:var(--like-color);"></i>';
        if (n.type === 'comment') iconHtml = '<i class="fas fa-comment" style="color:var(--accent-secondary);"></i>';
        if (n.type === 'follow') iconHtml = '<i class="fas fa-user-plus" style="color:var(--success);"></i>';

        return `
          <div class="notification-item ${!n.is_read ? 'unread' : ''}" data-post="${n.post_id || ''}" data-actor="${n.actor_username}">
            <div class="notif-actor-avatar-wrap">
              <img src="${n.actor_avatar}" class="notif-avatar" alt="${n.actor_name}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${n.actor_username}'">
              <div class="notif-type-badge">${iconHtml}</div>
            </div>
            <div class="notif-content-wrap">
              <p class="notif-text">
                <strong>${n.actor_name}</strong> (@${n.actor_username}) ${n.content}
              </p>
              <span class="notif-time">${window.PostsManager.formatTime(n.created_at)}</span>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
          this.closeModal('notifications-modal');
          const actor = item.dataset.actor;
          if (actor) {
            this.navigateToProfile(actor);
          }
        });
      });
    } catch (err) {
      list.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--danger);">${err.message}</div>`;
    }
  },

  /* ---------------------------------------------------------
     Lightbox Image Modal
  --------------------------------------------------------- */
  openLightbox(url) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    if (modal && img) {
      img.src = url;
      modal.classList.add('open');
    }
  },

  closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.classList.remove('open');
  },

  /* ---------------------------------------------------------
     Toast Feedback Notifications
  --------------------------------------------------------- */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px) scale(0.95)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
};

window.PulseApp = PulseApp;

// Auto-boot on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  PulseApp.init();
});
