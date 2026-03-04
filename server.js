const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data.json');

let users = {};
let posts = [];
let messages = {}; // { 'user1:user2': [ { from, text, time } ] }

if (fs.existsSync(DATA_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    users = loaded.users || {};
    posts = loaded.posts || [];
    messages = loaded.messages || {};
  } catch (e) {
    console.log('База битая — стартуем пустыми');
  }
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/admin', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') {
    return res.status(403).send('<h1 style="color:red;text-align:center">Пароль неверный</h1>');
  }
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'Заполни всё' });
  if (users[username]) return res.json({ success: false, error: 'Юзернейм занят' });

  users[username] = {
    password,
    name: username,
    photo: '',
    balance: 1000,
    premiumUntil: null,
    verified: false
  };
  saveData();
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!users[username] || users[username].password !== password) {
    return res.json({ success: false, error: 'Неверно' });
  }
  res.json({ success: true, username });
});

app.post('/profile', (req, res) => {
  const { username } = req.body;
  if (!users[username]) return res.json({ success: false, error: 'Нет такого' });
  res.json({ success: true, user: users[username] });
});

app.post('/profile/update', (req, res) => {
  const { username, name, photo } = req.body;
  if (!users[username]) return res.json({ success: false, error: 'Нет такого' });
  if (name) users[username].name = name;
  if (photo) users[username].photo = photo;
  saveData();
  res.json({ success: true });
});

app.post('/premium/buy', (req, res) => {
  const { username } = req.body;
  if (!users[username]) return res.json({ success: false, error: 'Нет такого' });
  if (users[username].balance < 299) return res.json({ success: false, error: 'Не хватает VXR' });

  users[username].balance -= 299;
  users[username].premiumUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
  saveData();
  res.json({ success: true });
});

app.get('/posts', (req, res) => res.json(posts));

app.post('/posts', (req, res) => {
  const { username, text, photo } = req.body;
  if (!users[username]) return res.json({ success: false, error: 'Войди' });

  posts.unshift({ id: Date.now(), username, text, photo, likes: 0, comments: [] });
  saveData();
  res.json({ success: true });
});

app.post('/messages/send', (req, res) => {
  const { from, to, text } = req.body;
  if (!users[from] || !users[to]) return res.json({ success: false, error: 'Нет юзера' });

  const key = [from, to].sort().join(':');
  if (!messages[key]) messages[key] = [];
  messages[key].push({ from, text, time: Date.now() });
  saveData();
  res.json({ success: true });
});

app.post('/messages/get', (req, res) => {
  const { user1, user2 } = req.body;
  const key = [user1, user2].sort().join(':');
  res.json({ success: true, messages: messages[key] || [] });
});

app.get('/admin/data', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') return res.json({ success: false });
  const userList = Object.keys(users).map(username => ({
    username,
    verified: users[username].verified,
    balance: users[username].balance || 0,
    premium: !!users[username].premiumUntil
  }));
  res.json({ success: true, users: userList });
});

app.get('/admin/verify', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') return res.send('Нет доступа');
  const username = req.
    query.user;
  const set = req.query.set === 'true';
  if (users[username]) {
    users[username].verified = set;
    saveData();
    res.send(set ? 'Галка выдана' : 'Галка забрана');
  } else {
    res.send('Юзера нет');
  }
});

app.get('/admin/balance', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') return res.send('Нет доступа');
  const username = req.query.user;
  const amt = parseInt(req.query.amt);
  if (users[username] && !isNaN(amt)) {
    users[username].balance += amt;
    if (users[username].balance < 0) users[username].balance = 0;
    saveData();
    res.send(`Баланс изменён на ${amt} VXR`);
  } else {
    res.send('Ошибка');
  }
});

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users, posts, messages }, null, 2));
}

app.listen(PORT, () => console.log(`Сервер запущен на ${PORT}`));
