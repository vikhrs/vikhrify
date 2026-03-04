import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public'))); // если будут картинки/стили/скрипты

// Отдаём главную страницу
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Отдаём админку
app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin.html'));
});

// ────────────────────────────────────────────────
// Пример API (пока заглушки — расширяй по мере надобности)
// ────────────────────────────────────────────────

let users = [
  { id: 1, username: "vikhrs", name: "Вик", avatar: "https://i.pravatar.cc/150?u=vikhrs", balance: 1200, isPremium: false, isVerified: true, isBlocked: false }
];

let posts = [];

// Получить текущего пользователя (заглушка)
app.get('/api/me', (req, res) => {
  res.json(users[0]);
});

// Обновить профиль
app.patch('/api/profile', (req, res) => {
  const { name, avatar } = req.body;
  users[0].name = name || users[0].name;
  if (avatar) users[0].avatar = avatar;
  res.json(users[0]);
});

// Купить премиум за 299 VXR
app.post('/api/premium/buy', (req, res) => {
  if (users[0].balance >= 299) {
    users[0].balance -= 299;
    users[0].isPremium = true;
    res.json({ success: true, balance: users[0].balance });
  } else {
    res.status(400).json({ success: false, message: "Недостаточно VXR" });
  }
});

// Список всех пользователей для админки и поиска чатов
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Пример создания поста
app.post('/api/posts', (req, res) => {
  const post = { id: posts.length + 1, ...req.body, createdAt: new Date() };
  posts.push(post);
  res.json(post);
});

app.get('/api/posts', (req, res) => {
  res.json(posts);
});

app.listen(PORT, () => {
  console.log(`Vikrify сервер → http://localhost:${PORT}`);
  console.log(`Главная:       http://localhost:${PORT}/`);
  console.log(`Админка:       http://localhost:${PORT}/admin`);
});
