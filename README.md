# PulseSphere — Modern Social Media Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-black.svg)](https://expressjs.com/)
[![SQLite3](https://img.shields.io/badge/SQLite-3-blue.svg)](https://www.sqlite.org/)
[![JavaScript](https://img.shields.io/badge/Frontend-Vanilla%20HTML%2FCSS%2FJS-yellow.svg)](https://developer.mozilla.org/)
[![CodeAlpha](https://img.shields.io/badge/Internship-CodeAlpha-blueviolet.svg)](https://codealpha.tech/)

A full-stack, responsive, and visually stunning developer & creator social network built with **Node.js, Express.js, SQLite3, and Vanilla HTML5/CSS3/JavaScript**. Features dynamic user profiles, rich post feeds with media & hashtags, nested comments, like & follow mechanics, explore & trending topics, notification drawer, and smooth Dark/Light mode switching.

Developed as part of the **CodeAlpha Web Development Internship**.

---

## 🌟 Key Features

### 👤 1. User Profiles & Customization
- **Rich Profile Headers:** Full-width cover banners, circular high-res avatars with glow borders, display names, and `@username` handles.
- **Dynamic Profile Stats:** Live counters for Followers, Following, Posts published, and Total Likes received.
- **Clickable Modals:** Click "Followers" or "Following" on any profile to see a dedicated modal with direct Follow/Unfollow toggles for each user.
- **Profile Metadata:** Location pin, clickable portfolio/website links, and membership join date.
- **In-App Profile Editor:** Edit your display name, bio, location, website, avatar (pick from curated presets or provide custom URL), and banner.
- **Global Profile Navigation:** Clicking any author's avatar or `@handle` anywhere in the app (feed, comments, search, or follower list) immediately opens their full profile.

### 📝 2. Posts & Media Publishing
- **Interactive Post Composer:**
  - Auto-expanding textarea with live character counter (up to 280 characters).
  - Quick hashtag selector and emoji shortcuts.
  - Image attachments (preset photo gallery or custom URL) with live preview and removal.
- **Dynamic Feeds:**
  - **🔥 For You:** Global feed of recent and trending tech posts.
  - **👥 Following:** Filtered feed showing exclusively posts by accounts you follow.
  - **🔖 Saved / Bookmarks:** Private collection of bookmarked posts.
- **Rich Post Cards:**
  - Automatic hashtag (`#webdev`, `#ai`) and mention (`@handle`) detection with click-to-filter.
  - Attached media with single-click Fullscreen Image Lightbox zoom.
  - Post owner controls: Delete post with confirmation.
  - Share link button with instant clipboard copy and toast feedback.

### 💬 3. Comments System
- **Inline Comment Drawer:** Expand replies under any post with zero page reload.
- **Add Replies:** Fast submission with immediate UI insertion and comment count badge updates.
- **Comment Likes:** Like individual comments with heart indicators and counters.
- **Delete Privileges:** Comment authors or original post owners can delete comments.

### ❤️ 4. Like & Follow System
- **Optimistic UI Updates:** Instant micro-interaction heart pulse animation upon liking a post.
- **Persistent Follow Relationships:** Follow/unfollow users with dynamic button hover states ("Following" ➔ "Unfollow").
- **Automatic Feed Updates:** Following a user immediately populates their posts into your "Following" tab.

### 🔍 5. Search & Discovery
- **Live Search Bar:** Real-time search by username, name, or hashtag with instant dropdown preview.
- **Trending Topics Sidebar:** Highlights popular hashtags (e.g., `#webdev`, `#ai`, `#design`, `#cybersecurity`) with active post counters.
- **Suggested Creators Widget:** Smart recommendations of accounts you don't follow yet, featuring 1-click follow buttons.

### 🔔 6. Notifications System
- Activity feed tracking:
  - Who liked your post
  - Who commented on your post
  - Who started following you
- Sticky navbar notification badge with unread counter.
- "Mark all as read" functionality.

### 🌓 7. Obsidian Dark & Crisp Light Themes
- **Default Dark Mode:** Deep obsidian glassmorphism surfaces (`#0a0d14`), subtle gradient borders, and glowing violet/cyan accents.
- **Light Mode:** Crisp, clean modern theme (`#f8fafc`).
- Saved in `localStorage` for automatic theme persistence.

### 🔑 8. Authentication & 1-Click Demo Reviewer Mode
- Secure registration and login with `bcryptjs` password hashing and signed JSON Web Tokens (`jsonwebtoken`).
- **1-Click Demo Switcher:** Reviewers can switch between 5 pre-seeded developer personalities with a single click inside the Sign In modal without typing credentials!

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5 Semantic Elements, Vanilla CSS3 (Custom Design System, Glassmorphism, CSS Custom Properties, Keyframe Animations), Vanilla JavaScript (ES6+ Modules, Fetch API, DOM manipulation) |
| **Backend** | Node.js, Express.js (REST API Architecture, CORS, Static File Serving) |
| **Database** | SQLite3 (`sqlite3` driver with async/await Promise wrappers) |
| **Security** | `bcryptjs` (Salted Password Hashing), `jsonwebtoken` (JWT bearer authorization) |
| **Icons & Typography** | FontAwesome 6, Google Fonts (*Plus Jakarta Sans* & *JetBrains Mono*) |

---

## 🚀 How to Run Locally

### Option 1: Double-Click (Recommended for Windows)
Simply double-click **`start.bat`** (or **`run.bat`**) in the project folder. It will:
1. Check and install dependencies automatically if needed.
2. Launch the Express server.
3. Automatically open your browser at `http://localhost:5050`.

---

### Option 2: Using the Command Line
1. Open PowerShell or Terminal in the project root:
   ```bash
   cd "c:\CODING\Web Development\CodeAlpha_SocialMediaPlatform"
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:5050
   ```

---

## 👤 Pre-Seeded Demo Accounts

The database comes pre-seeded with 5 realistic accounts, relationships, posts, and comments. You can sign in using **any** of the accounts below:

| Name | Username | Email | Password | Role / Bio |
|---|---|---|---|---|
| **Alex Rivera** | `@alexdev` | `alex@example.com` | `password123` | Full-Stack Developer & Open Source Contributor |
| **Sophia Chen** | `@sophiacodes` | `sophia@example.com` | `password123` | Senior UI/UX Architect & Creative Technologist |
| **Marcus Vance** | `@marcusai` | `marcus@example.com` | `password123` | Machine Learning Researcher & Neural Net Builder |
| **Elena Rostova** | `@elenacyber` | `elena@example.com` | `password123` | Cybersecurity Analyst & DevSecOps Advocate |
| **David Miller** | `@david_creates` | `david@example.com` | `password123` | Minimalist Designer & Tokyo Photographer |

*(You can also click the quick **"1-Click Demo Reviewer Accounts"** chips inside the Sign In modal).*

---

## 📦 Database Schema Overview

The database uses SQLite (`db/pulse_social.sqlite`) with relational foreign keys:

- **`users`**: `id`, `name`, `username`, `email`, `password`, `bio`, `avatar`, `cover_image`, `location`, `website`, `created_at`
- **`posts`**: `id`, `user_id`, `content`, `image_url`, `tag`, `created_at`
- **`comments`**: `id`, `post_id`, `user_id`, `content`, `created_at`
- **`likes`**: `id`, `user_id`, `post_id`, `created_at` *(UNIQUE user_id + post_id)*
- **`comment_likes`**: `id`, `user_id`, `comment_id`, `created_at` *(UNIQUE user_id + comment_id)*
- **`follows`**: `id`, `follower_id`, `following_id`, `created_at` *(UNIQUE follower_id + following_id)*
- **`bookmarks`**: `id`, `user_id`, `post_id`, `created_at` *(UNIQUE user_id + post_id)*
- **`notifications`**: `id`, `user_id`, `actor_id`, `type`, `post_id`, `content`, `is_read`, `created_at`

---

## 📡 REST API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Login with username/email & password
- `POST /api/auth/demo-login` — 1-click login for test users
- `GET /api/auth/demo-users` — Fetch demo users list
- `GET /api/auth/me` — Get current authenticated user details + stats

### Users & Profiles (`/api/users`)
- `GET /api/users/profile/:username` — Fetch user profile with stats & follow status
- `PUT /api/users/profile` — Update user profile details
- `POST /api/users/:id/follow` — Toggle follow / unfollow
- `GET /api/users/:id/followers` — List users following this user
- `GET /api/users/:id/following` — List users this user is following
- `GET /api/users/suggested` — Suggested creators to follow
- `GET /api/users/search?q=...` — Search users by name or username

### Posts (`/api/posts`)
- `GET /api/posts` — Fetch posts feed (`feed=for-you | following | bookmarks`, `tag=...`, `search=...`, `username=...`)
- `POST /api/posts` — Create a new post
- `GET /api/posts/:id` — Get single post details
- `DELETE /api/posts/:id` — Delete post (owner only)
- `POST /api/posts/:id/like` — Toggle like on post
- `POST /api/posts/:id/bookmark` — Toggle bookmark on post
- `GET /api/posts/trending/tags` — Top trending hashtags with counts

### Comments (`/api/comments`)
- `GET /api/comments/:postId/comments` — Fetch all comments for a post
- `POST /api/comments/:postId/comments` — Add a reply
- `DELETE /api/comments/:id` — Delete comment (author or post owner)
- `POST /api/comments/:id/like` — Toggle like on comment

### Notifications (`/api/notifications`)
- `GET /api/notifications` — Fetch user notifications
- `GET /api/notifications/unread-count` — Count unread notifications
- `PUT /api/notifications/read-all` — Mark all as read

---

## 📤 Uploading to GitHub

To publish this project to GitHub in a repository named **`CodeAlpha_SocialMediaPlatform`**:

```bash
# 1. Initialize git in the project root
cd "c:\CODING\Web Development\CodeAlpha_SocialMediaPlatform"
git init

# 2. Stage all files
git add .

# 3. Commit files
git commit -m "Initial commit: Full-Stack Social Media Platform for CodeAlpha"

# 4. Set branch to main
git branch -M main

# 5. Add remote origin (create the repository CodeAlpha_SocialMediaPlatform on your GitHub first)
git remote add origin https://github.com/pratyaypal54-ops/CodeAlpha_SocialMediaPlatform.git

# 6. Push source code to GitHub
git push -u origin main
```

---

## 👨‍💻 Author

**Pratyay Pal**  
- GitHub: [@pratyaypal54-ops](https://github.com/pratyaypal54-ops)  
- Project: **CodeAlpha Web Development Internship**
