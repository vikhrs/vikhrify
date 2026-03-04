const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// В памяти (потом замени на базу)
const users = {}; // { username: { password, name, photo: '', balance: 0, premiumUntil: null, verified: false } }
const posts = []; // [{ id, username, text, likes: 0, comments: [], isPremium: false }]
let postId = 1;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Регистрация
app.post('/register', (req, res) => {
  const { username, password, name = username } = req.body;
  if (users ) return res.status(400).json({ error: 'Юзер уже есть' });
  users = { password, name, photo: '', balance: 0, premiumUntil: null, verified: false };
  res.json({ success: true, username });
});

// Вход
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!users || users .password !== password) {
    return res.status(401).json({ error: 'Неправильный логин/пароль' });
  }
  res.json({ success: true, username });
});

// Админ-панель (простая, по /admin)
app.get('/admin', (req, res) => {
  const totalUsers = Object.keys(users).length;
  const totalPosts = posts.length;
  const activeUsers = new Set(posts.map(p => p.username)).size;

  res.json({
    totalUsers,
    totalPosts,
    activeUsers,
    users: Object.keys(users).map(u => ({ username: u, premium: !!users .premiumUntil }))
  });
});

// Лента постов
app.get('/posts', (req, res) => res.json(posts));

// Создать пост
app.post('/posts', (req, res) => {
  const { username, text, isPremium = false } = req.body;
  if (!users ) return res.status(403).json({ error: 'Кто ты?' });
  
  // Проверяем премиум
  if (isPremium && (!users .premiumUntil || users .premiumUntil < Date.now())) {
    return res.status(403).json({ error: 'Премиум нужен для такого поста' });
  }

  posts.unshift({ id: postId++, username, text, likes: 0, comments: [], isPremium });
  res.json({ success: true });
});

// Лайк
app.post('/posts/:id/like', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);
  if (post) post.likes++;
  res.json({ success: true });
});

// Коммент
app.post('/posts/:id/comment', (req, res) => {
  const { username, text } = req.body;
  const post = posts.find(p => p.id == req.params.id);
  if (post) post.comments.push({ username, text });
  res.json({ success: true });
});

// Купить премиум (за VXR или рубли — тут просто фейк)
app.post('/premium/buy', (req, res) => {
  const { username, method = 'VXR' } = req.body;
  if (!users ) return res.status(403).json({ error: 'Нет такого' });

  users .premiumUntil = Date.now() + 30 * 24 * 60 * 60 * 1000; // +30 дней
  users .verified = true;
  users .balance -= method === 'VXR' ? 500 : 0; // просто пример

  res.json({ success: true, until: new Date(users .premiumUntil).toLocaleDateString() });
});

app.listen(PORT, () => console.log(`Вихрифай запущен на ${PORT}`));
