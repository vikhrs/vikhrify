const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data.json');

let users = {};
let posts = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    users = loaded.users || {};
    posts = loaded.posts || [];
  } catch (e) {
    console.log('data.json битый — стартуем пустыми');
  }
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'Заполни всё' });
  if (users[username]) return res.json({ success: false, error: 'Юзернейм занят' });

  users[username] = {
    password,
    balance: 1000,
    verified: false,
    premiumUntil: null
  };
  saveData();
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!users[username] || users[username].password !== password) {
    return res.json({ success: false, error: 'Неверно' });
  }
  res.json({ success: true });
});

app.get('/posts', (req, res) => res.json(posts));

app.post('/posts', (req, res) => {
  const { username, text } = req.body;
  if (!users[username]) return res.json({ success: false, error: 'Войди сначала' });

  posts.unshift({ id: Date.now(), username, text, likes: 0, comments: [] });
  saveData();
  res.json({ success: true });
});

app.get('/admin', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') {
    return res.status(403).send('<h1 style="color:red;text-align:center">Пароль неверный</h1>');
  }

  const userList = Object.keys(users).map(username => ({
    username,
    verified: users[username].verified,
    balance: users[username].balance || 0,
    premium: !!users[username].premiumUntil
  }));

  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Админка Vikhrify</title>
      <style>
        body { background:#0d1117;color:#c9d1d9;font-family:Arial;padding:20px; }
        h1 { color:#58a6ff;text-align:center; }
        table { width:100%;border-collapse:collapse;margin-top:20px; }
        th,td { padding:10px;border:1px solid #30363d; }
        th { background:#161b22; }
        tr:hover { background:#1f2937; }
        .yes { color:#3fb950;font-weight:bold; }
        .no { color:#f85149; }
        button { background:#238636;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;margin:3px; }
      </style>
    </head>
    <body>
      <h1>Админка Vikhrify</h1>
      <table>
        <tr><th>@Юзер</th><th>Галочка</th><th>Баланс VXR</th><th>Действия</th></tr>
        ${userList.map(u => `
          <tr>
            <td>@${u.username}</td>
            <td class="${u.verified ? 'yes' : 'no'}">${u.verified ? '✓' : '—'}</td>
            <td>${u.balance}</td>
            <td>
              <button onclick="fetch('/admin/verify?user=${u.username}&pass=sehpy9-qiqjux-hofgyN').then(()=>location.reload())">Выдать галку</button>
            </td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `);
});

app.get('/admin/verify', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') return res.send('Нет доступа');
  const username = req.query.user;
  if (users[username]) {
    users[username].verified = true;
    saveData();
    res.send('Галка выдана');
  } else {
    res.send('Юзера нет');
  }
});

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users, posts }, null, 2));
}

app.listen(PORT, () => console.log(`Сервер запущен на ${PORT}`));
