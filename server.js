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
app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(join(__dirname, 'admin.html')));

// Временное хранилище (потом БД)
let users = [ ]; // {id, userId, content, image?}

// Регистрация
app.post('/api/register', (req, res) => {
  const { username, password, name } = req.body;
  if (!username  !password  !name) return res.status(400).json({ error: "Заполни всё" });

  if (users.some(u => u.username === username.toLowerCase())) {
    return res.status(409).json({ error: "Юзернейм занят" });
  }

  const newUser = {
    id: users.length + 1,
    username: username.toLowerCase(),
    name,
    password, // в реале — хеш!
    avatar: "" + username,
    balance: 0,
    isPremium: false,
    isVerified: false,
    isBlocked: false
  };
  users.push(newUser);
  res.json({ success: true, user: newUser });
});

// Логин
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: "Неверный логин/пароль" });
  res.json({ success: true, user });
});

// Текущий юзер (по id из фронта)
app.get('/api/me/:id', (req, res) => {
  const user = users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).json({ error: "Не найден" });
  res.json(user);
});

// Посты текущего юзера
app.get('/api/posts/:userId', (req, res) => {
  const userPosts = posts.filter(p => p.userId == req.params.userId);
  res.json(userPosts);
});

app.post('/api/posts', (req, res) => {
  const { userId, content } = req.body;
  const post = { id: posts.length + 1, userId, content, createdAt: new Date() };
  posts.push(post);
  res.json(post);
});

app.listen(PORT, () => {
  console.log(`Сайт на http://localhost:${PORT}`);
});
