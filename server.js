const user = users.find(u => u.id === Number(id));
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  if (balance !== undefined) {
    const newBal = Number(balance);
    if (isNaN(newBal)) return res.status(400).json({ error: 'Некорректный баланс' });
    user.balance = newBal;
  }

  if (isVerified !== undefined) user.isVerified = Boolean(isVerified);
  if (isBlocked !== undefined)   user.isBlocked   = Boolean(isBlocked);

  res.json({ success: true, updatedUser: user });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен → порт ${PORT}`);
  console.log(`Админка: http://localhost:${PORT}/admin`);
  console.log(`(пароль админа: ${ADMIN_PASSWORD})`);
});
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Жёстко заданный пароль админа (в продакшене лучше хранить в .env + хеш)
const ADMIN_PASSWORD = 'sehpy9-qiqjux-hofgyN';

// Middleware для проверки пароля админа
function checkAdminPassword(req, res, next) {
  const providedPassword = req.headers['x-admin-password'] || req.query.password;

  if (providedPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Неверный пароль админа' });
  }
  next();
}

app.use(cors());
app.use(express.json());

// Статические файлы (html, css, js если будут)
app.use(express.static(join(__dirname)));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Админ-панель (отдаёт html только после проверки пароля в браузере)
app.get('/admin', (req, res) => {
  // Здесь можно сделать отдельную страницу ввода пароля, но для простоты пока пропускаем через заголовок
  // В реальности лучше сделать форму логина админа
  res.sendFile(join(__dirname, 'admin.html'));
});

// Хранилище в памяти (до рестарта сервера)
let users = [];
let posts = [];

// ─── Регистрация ────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { username, password, name } = req.body || {};

  if (!username  !password  !name) {
    return res.status(400).json({ error: 'Заполни имя, юзернейм и пароль' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (users.some(u => u.username === cleanUsername)) {
    return res.status(409).json({ error: 'Юзернейм занят' });
  }

  const newUser = {
    id: users.length + 1,
    username: cleanUsername,
    name: name.trim(),
    password, // В продакшене → bcrypt.hashSync(password, 10)
    avatar: https://i.pravatar.cc/150?u=${cleanUsername},
    balance: 0,
    isPremium: false,
    isVerified: false,
    isBlocked: false
  };

  users.push(newUser);
  res.json({ success: true, user: newUser });
});

// ─── Логин ──────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const user = users.find(u => u.username === cleanUsername && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Неверные данные' });
  }

  res.json({ success: true, user });
});

// ─── Мой профиль ────────────────────────────────────────────────
app.get('/api/me/:id', (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(user);
});

// ─── Посты пользователя ─────────────────────────────────────────
app.get('/api/posts/:userId', (req, res) => {
  const userPosts = posts.filter(p => p.userId === Number(req.params.userId));
  res.json(userPosts);
});

app.post('/api/posts', (req, res) => {
  const { userId, content } = req.body || {};

  if (!userId || !content?.trim()) {
    return res.status(400).json({ error: 'Нет id пользователя или текста' });
  }

  const post = {
    id: posts.length + 1,
    userId: Number(userId),
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  posts.push(post);
  res.json(post);
});

// ─── АДМИН ──────────────────────────────────────────────────────

// Получить всех пользователей (только админ)
app.get('/api/admin/users', checkAdminPassword, (req, res) => {
  res.json(users);
});

// Обновить пользователя (баланс, верификация, бан)
app.patch('/api/admin/update-user', checkAdminPassword, (req, res) => {
  const { id, balance, isVerified, isBlocked } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Не указан id пользователя' });
  }
