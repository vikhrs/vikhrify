const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

let users = {}; // ключ — username
let posts = [];

if (fs.existsSync(DATA_FILE)) {
  const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  users = loaded.users || {};
  posts = loaded.posts || [];
}

app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// === ТВОЙ КОД РЕГИСТРАЦИИ И ВХОДА ОСТАЛСЯ БЕЗ ИЗМЕНЕНИЙ (только добавил /api/ для совместимости) ===
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
    avatar: 'https://via.placeholder.com/80?text=User'
  };
  saveData();
  res.json({ success: true, user: users[username] });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) return res.json({ success: false, error: 'Неверно' });
  res.json({ success: true, user });
});

// === НОВЫЕ ЭНДПОИНТЫ ДЛЯ ТВОЕГО ФРОНТЕНДА ===
app.get('/api/me/:id', (req, res) => {
  const user = Object.values(users).find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Не найден' });
  res.json(user);
});

app.get('/api/posts/:id', (req, res) => {
  const userPosts = posts.filter(p => p.userId === req.params.id);
  res.json(userPosts);
});

app.post('/api/posts', (req, res) => {
  const { userId, content } = req.body;
  const user = Object.values(users).find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: 'Войди' });
  posts.unshift({ id: Date.now(), userId, content, createdAt: new Date() });
  saveData();
  res.json({ success: true });
});

// === НОВАЯ ФУНКЦИЯ ПОКУПКИ VXR ===
app.post('/api/buy-vxr', (req, res) => {
  const { userId, amount } = req.body;
  if (!amount || amount < 100 || amount > 10000) return res.json({ success: false, error: 'Сумма должна быть 100-10000 VXR' });

  const user = Object.values(users).find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: 'Пользователь не найден' });

  user.balance = (user.balance || 0) + amount;
  saveData();
  res.json({ success: true, newBalance: user.balance });
});

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users, posts }, null, 2));
}

app.listen(PORT, () => console.log(`🚀 Сервер на http://localhost:${PORT}`));
