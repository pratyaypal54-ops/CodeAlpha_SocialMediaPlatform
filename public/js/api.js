/**
 * greenit API Client
 * Centralized HTTP request handling with JWT authentication
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? `${window.location.origin}/api`
  : '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('pulse_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('pulse_token', token);
    } else {
      localStorage.removeItem('pulse_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && this.token) {
          // Token expired or invalid
          this.setToken(null);
          localStorage.removeItem('pulse_user');
          if (window.PulseApp && window.PulseApp.onAuthExpired) {
            window.PulseApp.onAuthExpired();
          }
        }
        throw new Error(data.error || 'Request failed. Please try again.');
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth methods
  login(login, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });
  }

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  demoLogin(username) {
    return this.request('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  }

  getDemoUsers() {
    return this.request('/auth/demo-users');
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Posts methods
  getPosts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/posts${query ? '?' + query : ''}`);
  }

  getPost(id) {
    return this.request(`/posts/${id}`);
  }

  createPost(postData) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  deletePost(id) {
    return this.request(`/posts/${id}`, {
      method: 'DELETE'
    });
  }

  toggleLikePost(id) {
    return this.request(`/posts/${id}/like`, {
      method: 'POST'
    });
  }

  toggleBookmarkPost(id) {
    return this.request(`/posts/${id}/bookmark`, {
      method: 'POST'
    });
  }

  getTrendingTags() {
    return this.request('/posts/trending/tags');
  }

  // Comments methods
  getComments(postId) {
    return this.request(`/comments/${postId}/comments`);
  }

  addComment(postId, content) {
    return this.request(`/comments/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  deleteComment(id) {
    return this.request(`/comments/${id}`, {
      method: 'DELETE'
    });
  }

  toggleLikeComment(id) {
    return this.request(`/comments/${id}/like`, {
      method: 'POST'
    });
  }

  // Users & Profiles methods
  getProfile(username) {
    return this.request(`/users/profile/${username}`);
  }

  updateProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  toggleFollow(userId) {
    return this.request(`/users/${userId}/follow`, {
      method: 'POST'
    });
  }

  getFollowers(userId) {
    return this.request(`/users/${userId}/followers`);
  }

  getFollowing(userId) {
    return this.request(`/users/${userId}/following`);
  }

  getSuggestedUsers() {
    return this.request('/users/suggested');
  }

  searchUsers(q) {
    return this.request(`/users/search?q=${encodeURIComponent(q)}`);
  }

  // Notifications
  getNotifications() {
    return this.request('/notifications');
  }

  getUnreadCount() {
    return this.request('/notifications/unread-count');
  }

  markNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT'
    });
  }
}

window.api = new ApiClient();
