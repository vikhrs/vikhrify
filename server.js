import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_FILE = join(__dirname, 'data.json');

let data = { users: [], posts: [], messages: [], follows: {} };

async function loadData() {
  try {
    data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch (e) {
    data = { users: [], posts: [], messages: [], follows: {} };
  }
}

async function saveData() {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

await loadData();

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin.html'));
});

// Регистрация — НЕ ТРОГАЕМ
app.post('/api/register', async (req, res) => {
  const { name, username, password } = req.body || {};

  if (!name?.trim() || !username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'Заполни имя, юзернейм и пароль' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (data.users.some(u => u.username === cleanUsername)) {
    return res.status(409).json({ error: 'Юзернейм занят' });
  }

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    username: cleanUsername,
    password,
    avatar: 'https://via.placeholder.com/150?text=User',
    balance: 1000,
    isPremium: false,
    badge: 'none',
    referralCode: Math.random().toString(36).slice(2,8).toUpperCase()
  };

  data.users.push(newUser);
  data.follows[cleanUsername] = { following: [], followers: [] };
  await saveData();
  res.json({ success: true, user: { ...newUser, password: undefined } });
});

// Логин — НЕ ТРОГАЕМ
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUsername = username?.trim().toLowerCase();
  const user = data.users.find(u => u.username === cleanUsername && u.password === password);
  if (!user) return res.status(401).json({ error: 'Неверные данные' });
  res.json({ success: true, user: { ...user, password: undefined } });
});

app.get('/api/me/:id', (req, res) => {
  const user = data.users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const followers = data.follows[user.username]?.followers?.length || 0;
  res.json({ ...user, followers, password: undefined });
});

app.get('/api/user/:username', (req, res) => {
  const user = data.users.find(u => u.username === req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Не найден' });
  const followers = data.follows[user.username]?.followers?.length || 0;
  res.json({ ...user, followers, password: undefined });
});

app.get('/api/search-users', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json([]);
  const results = data.users
    .filter(u => u.username.startsWith(q))
    .slice(0, 8)
    .map(u => ({ username: u.username, name: u.name, avatar: u.avatar, badge: u.badge }));
  res.json(results);
});

app.get('/api/posts', (req, res) => res.json(data.posts));

app.post('/api/posts', async (req, res) => {
  const { userId, content, image } = req.body;
  const user = data.users.find(u => u.id == userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const post = {
    id: Date.now(),
    userId,
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    content: content.trim(),
    image: image || null,
    badge: user.badge,
    createdAt: new Date().toISOString()
  };

  data.posts.unshift(post);
  await saveData();
  res.json(post);
});

app.post('/api/buy-premium', async (req, res) => {
  const { userId } = req.body;
  const user = data.users.find(u => u.id == userId);
  if (!user) return res.status(404).json({ error: 'Не найден' });
  if (user.balance < 499) return res.status(400).json({ error: 'Недостаточно VXR (нужно 499)' });
  user.balance -= 499;
  user.isPremium = true;
  user.badge = 'yellow';
  await saveData();
  res.json({ success: true });
});

app.post('/api/set-badge', async (req, res) => {
  const { targetUsername, badge, adminId } = req.body;
  const admin = data.users.find(u => u.id == adminId);
  if (!admin || admin.username !== 'admin') return res.status(403).json({ error: 'Доступ только admin' });
  const target = data.users.find(u => u.username === targetUsername.toLowerCase());
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' });
  target.badge = badge;
  await saveData();
  res.json({ success: true });
});

app.post('/api/clear-posts', async (req, res) => {
  const { adminId } = req.body;
  const admin = data.users.find(u => u.id == adminId);
  if (!admin || admin.username !== 'admin') return res.status(403).json({ error: 'Доступ только admin' });
  data.posts = [];
  await saveData();
  res.json({ success: true });
});

app.post('/api/send-message', async (req, res) => {
  const { fromUsername, toUsername, text } = req.body;
  if (!text?.trim()) return res.json({ success: false });
  const msg = { id: Date.now(), fromUsername, toUsername, text, timestamp: Date.now() };
  data.messages.push(msg);
  await saveData();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
