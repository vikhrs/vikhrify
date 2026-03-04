const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

let users = {};
let posts = [];
let messages = [];          // { id, fromId, toId, text, timestamp }
let follows = {};           // { username: { following: [usernames], followers: [usernames] } }

if (fs.existsSync(DATA_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    users = loaded.users || {};
    posts = loaded.posts || [];
    messages = loaded.messages || [];
    follows = loaded.follows || {};
  } catch (e) {}
}

app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// РЕГИСТРАЦИЯ И ВХОД — НЕ ТРОГАЕМ ЭТУ ЧАСТЬ
app.post('/api/register', (req, res) => {
  const { name, username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'Заполни всё' });
  if (users[username]) return res.json({ success: false, error: 'Юзернейм занят' });

  const id = Date.now().toString();
  users[username] = {
    id,
    name: name || username,
    username,
    password,
    balance: 1000,
    badge: 'none',
    isPremium: false,
    avatar: 'https://via.placeholder.com/80?text=User',
    referralCode: Math.random().toString(36).slice(2, 8).toUpperCase()
  };
  follows[username] = { following: [], followers: [] };
  saveData();
  res.json({ success: true, user: users[username] });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) return res.json({ success: false, error: 'Неверно' });
  res.json({ success: true, user });
});

// ─── Остальные API ──────────────────────────────────────────────────────

app.get('/api/me/:id', (req, res) => {
  const u = Object.values(users).find(u => u.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Не найден' });
  const followersCount = follows[u.username]?.followers?.length || 0;
  res.json({ ...u, followers: followersCount });
});

app.get('/api/user/:username', (req, res) => {
  const u = users[req.params.username];
  if (!u) return res.status(404).json({ error: 'Не найден' });
  const followersCount = follows[req.params.username]?.followers?.length || 0;
  res.json({ ...u, followers: followersCount });
});

app.get('/api/search-users', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json([]);
  const results = Object.values(users)
    .filter(u => u.username.toLowerCase().startsWith(q))
    .slice(0, 8)
    .map(u => ({ id: u.id, username: u.username, name: u.name, avatar: u.avatar, badge: u.badge || 'none' }));
  res.json(results);
});

app.post('/api/posts', (req, res) => {
  const { userId, content } = req.body;
  const user = Object.values(users).find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: 'Войди' });
  const post = {
    id: Date.now(),
    userId,
    username: user.username,
    content,
    createdAt: new Date().toISOString()
  };
  posts.unshift(post);
  saveData();
  res.json({ success: true, post });
});

app.get('/api/posts', (req, res) => res.json(posts));

app.post('/api/buy-premium', (req, res) => {
  const { userId } = req.body;
  const user = Object.values(users).find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: 'Не найден' });
  if (user.balance < 499) return res.json({ success: false, error: 'Недостаточно VXR (нужно 499)' });
  user.balance -= 499;
  user.isPremium = true;
  user.badge = 'yellow';
  saveData();
  res.json({ success: true });
});

app.post('/api/set-badge', (req, res) => {
  const { targetUsername, badge, adminId } = req.body;
  const adminUser = Object.values(users).find(u => u.id === adminId);
  if (!adminUser || adminUser.username !== 'admin') return res.json({ success: false, error: 'Доступ только admin' });
  const target = users[targetUsername];
  if (!target) return res.json({ success: false, error: 'Пользователь не найден' });
  target.badge = badge; // 'none', 'blue', 'yellow', 'red'
  saveData();
  res.json({ success: true });
});

app.post('/api/clear-posts', (req, res) => {
  const { adminId } = req.body;
  const adminUser = Object.values(users).find(u => u.id === adminId);
  if (!adminUser || adminUser.username !== 'admin') return res.json({ success: false, error: 'Доступ только admin' });
  posts = [];
  saveData();
  res.json({ success: true });
});

app.post('/api/follow', (req, res) => {
  const { followerId, targetUsername } = req.body;
  const follower = Object.values(users).find(u => u.id === followerId);
  if (!follower) return res.json({ success: false, error: 'Не авторизован' });
  if (!users[targetUsername]) return res.json({ success: false, error: 'Пользователь не найден' });
  if (follows[follower.username].following.includes(targetUsername)) {
    return res.json({ success: false, error: 'Уже подписан' });
  }
  follows[follower.username].following.push(targetUsername);
  follows[targetUsername].followers.push(follower.username);
  saveData();
  res.json({ success: true });
});

app.get('/api/messages/:withUsername', (req, res) => {
  const currentUser = /* нужно передать current username или id через query или header, но для простоты пока пропустим проверку */;
  // Фильтруем сообщения между двумя пользователями
  const msgs = messages.filter(m =>
    (m.fromUsername === req.params.withUsername && m.toUsername === 'current') ||
    (m.fromUsername === 'current' && m.toUsername === req.params.withUsername)
  ).sort((a,b) => a.timestamp - b.timestamp);
  res.json(msgs);
});

app.post('/api/send-message', (req, res) => {
  const { fromUsername, toUsername, text } = req.body;
  if (!users[fromUsername] || !users[toUsername] || !text.trim()) return res.json({ success: false });
  const msg = {
    id: Date.now(),
    fromUsername,
    toUsername,
    text,
    timestamp: Date.now()
  };
  messages.push(msg);
  saveData();
  res.json({ success: true, msg });
});

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users, posts, messages, follows }, null, 2));
}

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
