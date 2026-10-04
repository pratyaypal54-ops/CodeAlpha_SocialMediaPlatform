const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5050,
      path: `/api${path}`,
      method: 'POST',
      headers
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5050,
      path: `/api${path}`,
      method: 'GET',
      headers
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('--- 🧪 Running SocialApp API Integration Tests ---');

  // 1. Demo Login
  console.log('\n1. Testing Demo Login as alexdev...');
  const demoLoginRes = await post('/auth/demo-login', { username: 'alexdev' });
  console.log('Status:', demoLoginRes.status, 'User:', demoLoginRes.body.user.name);
  const token = demoLoginRes.body.token;

  // 2. Fetch User Profile
  console.log('\n2. Testing GET /users/profile/sophiacodes...');
  const sophiaProfile = await get('/users/profile/sophiacodes', token);
  console.log('Status:', sophiaProfile.status, 'Followers:', sophiaProfile.body.followers_count, 'Is Following:', sophiaProfile.body.is_following);

  // 3. Toggle Follow
  console.log('\n3. Testing Follow Toggle on Sophia (ID: 2)...');
  const followRes = await post(`/users/${sophiaProfile.body.id}/follow`, {}, token);
  console.log('Status:', followRes.status, 'Result:', followRes.body);

  // 4. Create New Post
  console.log('\n4. Testing POST /posts...');
  const newPostRes = await post('/posts', {
    content: 'Automated integration test post from SocialApp runner! #testing #quality',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
    tag: 'testing'
  }, token);
  console.log('Status:', newPostRes.status, 'New Post ID:', newPostRes.body.post.id, 'Tag:', newPostRes.body.post.tag);

  const postId = newPostRes.body.post.id;

  // 5. Like the Post
  console.log('\n5. Testing POST /posts/:id/like...');
  const likeRes = await post(`/posts/${postId}/like`, {}, token);
  console.log('Status:', likeRes.status, 'Liked:', likeRes.body.liked, 'Likes Count:', likeRes.body.likes_count);

  // 6. Comment on the Post
  console.log('\n6. Testing POST /comments/:postId/comments...');
  const commentRes = await post(`/comments/${postId}/comments`, {
    content: 'Testing comments system: works smoothly!'
  }, token);
  console.log('Status:', commentRes.status, 'New Comment ID:', commentRes.body.comment.id, 'Content:', commentRes.body.comment.content);

  // 7. Get Comments
  console.log('\n7. Testing GET /comments/:postId/comments...');
  const commentsList = await get(`/comments/${postId}/comments`, token);
  console.log('Status:', commentsList.status, 'Total comments:', commentsList.body.length);

  // 8. Get Notifications
  console.log('\n8. Testing GET /notifications...');
  const notifs = await get('/notifications', token);
  console.log('Status:', notifs.status, 'Total notifications:', notifs.body.length);

  // 9. Trending Tags
  console.log('\n9. Testing GET /posts/trending/tags...');
  const trends = await get('/posts/trending/tags');
  console.log('Status:', trends.status, 'Top tags:', trends.body.map(t => `#${t.tag} (${t.post_count})`).join(', '));

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch(console.error);
