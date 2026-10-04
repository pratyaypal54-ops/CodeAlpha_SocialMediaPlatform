const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./database');

async function seed() {
  await initDatabase();

  const userCountRow = await db.getAsync('SELECT COUNT(*) as count FROM users');
  if (userCountRow && userCountRow.count > 0) {
    console.log(`Database already seeded with ${userCountRow.count} users.`);
    return;
  }

  console.log('Seeding fresh database with users, posts, comments, likes, and follows...');

  const defaultPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      name: 'Alex Rivera',
      username: 'alexdev',
      email: 'alex@example.com',
      password: defaultPassword,
      bio: 'Full-Stack Developer 💻 | Open-Source Enthusiast | TypeScript, Node.js & React fan | Building the future of the web ✨',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      cover_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      location: 'San Francisco, CA',
      website: 'https://github.com/alexdev'
    },
    {
      name: 'Sophia Chen',
      username: 'sophiacodes',
      email: 'sophia@example.com',
      password: defaultPassword,
      bio: 'Staff UI/UX Engineer & Creative Technologist 🎨 | Design systems, micro-interactions, CSS wizardry | Coffee & Figma ☕',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      cover_image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
      location: 'Vancouver, Canada',
      website: 'https://sophiachen.design'
    },
    {
      name: 'Marcus Vance',
      username: 'marcusai',
      email: 'marcus@example.com',
      password: defaultPassword,
      bio: 'AI/ML Researcher 🧠 | Exploring LLMs, agentic workflows, neural rendering | Python & PyTorch nerd | Runner 🏃‍♂️',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      cover_image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      location: 'Austin, TX',
      website: 'https://marcusvance.ai'
    },
    {
      name: 'Elena Rostova',
      username: 'elenacyber',
      email: 'elena@example.com',
      password: defaultPassword,
      bio: 'Cybersecurity Analyst & DevSecOps advocate 🛡️ | Zero-trust architecture, ethical hacking & decentralized protocols.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      cover_image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      location: 'Berlin, Germany',
      website: 'https://elenasec.io'
    },
    {
      name: 'David Miller',
      username: 'david_creates',
      email: 'david@example.com',
      password: defaultPassword,
      bio: 'Product Designer & Travel Photographer 📸 | Minimalism, Scandinavian architecture, clean setups & calm code.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      cover_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      location: 'Tokyo, Japan',
      website: 'https://davidmiller.me'
    }
  ];

  const userIds = [];
  for (const u of users) {
    const res = await db.runAsync(
      `INSERT INTO users (name, username, email, password, bio, avatar, cover_image, location, website)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.name, u.username, u.email, u.password, u.bio, u.avatar, u.cover_image, u.location, u.website]
    );
    userIds.push(res.lastID);
  }

  // Pre-seed follow relationships
  // 1: Alex, 2: Sophia, 3: Marcus, 4: Elena, 5: David
  const follows = [
    [1, 2], // Alex follows Sophia
    [1, 3], // Alex follows Marcus
    [1, 4], // Alex follows Elena
    [2, 1], // Sophia follows Alex
    [2, 3], // Sophia follows Marcus
    [2, 5], // Sophia follows David
    [3, 1], // Marcus follows Alex
    [3, 2], // Marcus follows Sophia
    [4, 1], // Elena follows Alex
    [4, 3], // Elena follows Marcus
    [5, 2]  // David follows Sophia
  ];

  for (const [follower, following] of follows) {
    await db.runAsync(
      'INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
      [follower, following]
    );
  }

  // Pre-seed Posts
  const posts = [
    {
      user_id: 1,
      content: 'Just deployed our new real-time architecture using Node.js & WebSockets! Latency dropped by 64% across all regions. The feeling when your optimization benchmarks turn all green is unmatched. 🚀 What tech stack are you building on this weekend? #webdev #javascript #coding',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
      tag: 'webdev'
    },
    {
      user_id: 2,
      content: 'Refined our glassmorphism design system today ✨ Adding subtle 1px border gradients and cubic-bezier transitions completely elevates the user experience. Micro-interactions are what separate good apps from unforgettable ones. Swipe for design details! 🎨 #design #uiux #frontend',
      image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80',
      tag: 'design'
    },
    {
      user_id: 3,
      content: 'Experimenting with local small-language models on edge hardware. Getting 42 tokens/sec on an M-series chip with 4-bit quantization! The era of private, local intelligence running directly in your browser or laptop is officially here. 🤖⚡ What are your thoughts on agentic workflows? #ai #machinelearning #tech',
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
      tag: 'ai'
    },
    {
      user_id: 4,
      content: 'Reminder to all developers: Never commit your .env files or hardcode JWT secrets in client bundles! 🔐 Always rotate API keys regularly and enforce rate limiting on auth endpoints. Security is not an afterthought, it is foundational. Stay safe out there! 🛡️ #cybersecurity #devops',
      image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80',
      tag: 'cybersecurity'
    },
    {
      user_id: 5,
      content: 'Quiet morning desk setup here in Tokyo. Rain outside, hot matcha tea, and 2 hours of deep focus flow on the new dashboard wireframes. Minimalism in physical space leads directly to clarity in creative thought. ☕⛩️ #workspace #productivity #minimalism',
      image_url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1000&q=80',
      tag: 'productivity'
    },
    {
      user_id: 2,
      content: 'Quick CSS tip: Use CSS custom properties (variables) with `color-mix()` for seamless automatic dark and light theme tints! No heavy CSS-in-JS runtime required. Pure browser speed. ⚡ #css #frontend #tips',
      image_url: '',
      tag: 'frontend'
    },
    {
      user_id: 1,
      content: 'Happy to announce that greenit v1 is live! Built as a clean, simple and high-performance social platform. Huge shoutout to the community for continuous feedback! 🌿🎉 #community #greenit',
      image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
      tag: 'milestone'
    }
  ];

  const postIds = [];
  for (const p of posts) {
    const res = await db.runAsync(
      'INSERT INTO posts (user_id, content, image_url, tag) VALUES (?, ?, ?, ?)',
      [p.user_id, p.content, p.image_url, p.tag]
    );
    postIds.push(res.lastID);
  }

  // Pre-seed Likes
  const likes = [
    [2, 1], // Sophia liked Alex's post 1
    [3, 1], // Marcus liked Alex's post 1
    [4, 1], // Elena liked Alex's post 1
    [5, 1], // David liked Alex's post 1
    [1, 2], // Alex liked Sophia's design post
    [3, 2], // Marcus liked Sophia's design post
    [5, 2], // David liked Sophia's design post
    [1, 3], // Alex liked Marcus's AI post
    [2, 3], // Sophia liked Marcus's AI post
    [4, 3], // Elena liked Marcus's AI post
    [1, 4], // Alex liked Elena's security post
    [2, 4], // Sophia liked Elena's security post
    [1, 5], // Alex liked David's setup
    [2, 5], // Sophia liked David's setup
    [3, 7], // Marcus liked milestone post
    [4, 7], // Elena liked milestone post
    [5, 7]  // David liked milestone post
  ];

  for (const [userId, postId] of likes) {
    await db.runAsync(
      'INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)',
      [userId, postId]
    );
  }

  // Pre-seed Comments
  const comments = [
    {
      post_id: 1,
      user_id: 2,
      content: 'Incredible speedup Alex! Are you using gzip or brotli compression on those payloads as well?'
    },
    {
      post_id: 1,
      user_id: 1,
      content: '@sophiacodes Brotli for static assets and snappy JSON streaming for real-time deltas! Works wonders.'
    },
    {
      post_id: 1,
      user_id: 3,
      content: '64% latency drop is huge. Would love to read an engineering blog post breakdown on this!'
    },
    {
      post_id: 2,
      user_id: 1,
      content: 'That subtle border gradient is perfection Sophia! Adds so much depth without clutter.'
    },
    {
      post_id: 2,
      user_id: 5,
      content: 'Saved to my design inspiration board. Beautiful palette choice!'
    },
    {
      post_id: 3,
      user_id: 4,
      content: 'Local inference is the biggest leap forward for privacy. No data ever leaves the perimeter.'
    },
    {
      post_id: 4,
      user_id: 1,
      content: 'Preach! Adding automated secret scanners to pre-commit git hooks is a lifesaver.'
    },
    {
      post_id: 5,
      user_id: 2,
      content: 'That desk lighting is dreamy! Where did you get that monitor light bar?'
    },
    {
      post_id: 7,
      user_id: 3,
      content: 'Congratulations team! The UI is buttery smooth. Excited to see where this goes! 🚀'
    }
  ];

  for (const c of comments) {
    await db.runAsync(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [c.post_id, c.user_id, c.content]
    );
  }

  // Pre-seed Notifications
  await db.runAsync(
    `INSERT INTO notifications (user_id, actor_id, type, post_id, content)
     VALUES (1, 2, 'like', 1, 'liked your post about WebSockets optimization')`
  );
  await db.runAsync(
    `INSERT INTO notifications (user_id, actor_id, type, post_id, content)
     VALUES (1, 2, 'comment', 1, 'commented on your post')`
  );
  await db.runAsync(
    `INSERT INTO notifications (user_id, actor_id, type, content)
     VALUES (1, 3, 'follow', 'started following you')`
  );

  console.log('Database successfully seeded with demo accounts, posts, comments, likes & follows!');
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed script error:', err);
      process.exit(1);
    });
}

module.exports = seed;
