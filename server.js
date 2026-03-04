const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Загрузка данных из файла
let data = { users: {} };
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Ошибка чтения data.json:', err);
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Админ-панель (отдельная страница)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Регистрация
app.post('/api/register', (req, res) => {
  const { name, username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, error: 'Юзернейм и пароль обязательны' });
  }

  const cleanUsername = username.trim().toLowerCase();

  if (data.users[cleanUsername]) {
    return res.json({ success: false, error: 'Юзернейм занят' });
  }

  const user = {
    id: Date.now().toString(),
    name: name?.trim() || cleanUsername,
    username: cleanUsername,
    password,
    balance: 1000,
    isPremium: false,
    badge: 'none',
    referralCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
    followers: 0,
    avatar: 'https://via.placeholder.com/80?text=User'
  };

  data.users[cleanUsername] = user;
  saveData();

  res.json({ success: true, user: { id: user.id, name: user.name, username: user.username, balance: user.balance, isPremium: user.isPremium, badge: user.badge, referralCode: user.referralCode } });
});

// Вход
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const clean = username?.trim().toLowerCase();

  const user = data.users[clean];

  if (!user || user.password !== password) {
    return res.json({ success: false, error: 'Неверный юзернейм или пароль' });
  }

  res.json({ success: true, user: { id: user.id, name: user.name, username: user.username, balance: user.balance, isPremium: user.isPremium, badge: user.badge, referralCode: user.referralCode } });
});

// Покупка Premium
app.post('/api/buy-premium', (req, res) => {
  const { userId } = req.body;

  let foundUser = null;
  for (const key in data.users) {
    if (data.users[key].id === userId) {
      foundUser = data.users[key];
      break;
    }
  }

  if (!foundUser) return res.json({ success: false, error: 'Пользователь не найден' });
  if (foundUser.balance < 499) return res.json({ success: false, error: 'Недостаточно VXR' });

  foundUser.balance -= 499;
  foundUser.isPremium = true;
  foundUser.badge = 'yellow';

  saveData();

  res.json({ success: true, user: { id: foundUser.id, name: foundUser.name, username: foundUser.username, balance: foundUser.balance, isPremium: true, badge: 'yellow' } });
});

// Выдать галочку (админ)
app.post('/api/set-badge', (req, res) => {
  const { targetUsername, badge } = req.body;

  const cleanTarget = targetUsername.trim().toLowerCase();
  const target = data.users[cleanTarget];

  if (!target) return res.json({ success: false, error: 'Пользователь не найден' });

  target.badge = badge;
  saveData();

  res.json({ success: true });
});

// Накрутка подписчиков (админ)
app.post('/api/fake-followers', (req, res) => {
  const { targetUsername, amount } = req.body;

  if (!Number.isInteger(amount) || amount < 1 || amount > 100000) {
    return res.json({ success: false, error: 'Некорректное количество' });
  }

  const cleanTarget = targetUsername.trim().toLowerCase();
  const target = data.users[cleanTarget];

  if (!target) return res.json({ success: false, error: 'Пользователь не найден' });

  target.followers = (target.followers || 0) + amount;

  saveData();

  res.json({ success: true, newFollowers: target.followers });
});

// Очистка ленты (админ)
app.post('/api/clear-posts', (req, res) => {
  // Здесь можно добавить логику очистки постов, если они есть в data.posts
  // Пока просто заглушка
  res.json({ success: true, message: 'Лента очищена' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Админ-панель: http://localhost:${PORT}/admin`);
});
