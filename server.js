const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const users = {}; // username → { password, name, balance, premiumUntil, verified }
const posts = [];
let postIdCounter = 1;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Регистрация
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, error: 'Заполни всё' });
  if (users ) return res.status(400).json({ success: false, error: 'Юзер занят' });

  users = {
    password,
    name: username,
    balance: 1000,
    premiumUntil: null,
    verified: false // галочка НЕ ставится автоматически!
  };
  res.json({ success: true });
});

// Вход
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!users || users .password !== password) {
    return res.status(401).json({ success: false, error: 'Неверно' });
  }
  res.json({ success: true, username });
});

// Профиль
app.post('/profile', (req, res) => {
  const { username } = req.body;
  if (!users ) return res.status(404).json({ success: false, error: 'Нет такого' });
  res.json({ success: true, user: users });
});

// Купить премиум (без галочки)
app.post('/premium/buy', (req, res) => {
  const { username } = req.body;
  if (!users ) return res.status(403).json({ success: false, error: 'Нет такого' });
  if (users .balance < 500) return res.status(400).json({ success: false, error: 'Мало VXR' });

  users .balance -= 500;
  users .premiumUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
  // verified НЕ меняется!
  res.json({ success: true, until: new Date(users .premiumUntil).toLocaleDateString('ru-RU') });
});

// Админка — красивая + кнопка верификации
app.get('/admin', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') {
    return res.status(403).send('<h1 style="color:red;text-align:center">Пароль хуйня</h1>');
  }

  const usersList = Object.entries(users).map(( ) => ({
    username: u,
    premium: !!d.premiumUntil,
    verified: d.verified,
    balance: d.balance
  }));

  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Vikhrify Admin</title>
      <style>
        body { background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:20px; }
        h1 { color:#58a6ff;text-align:center; }
        table { width:100%;border-collapse:collapse; }
        th,td { padding:12px;border:1px solid #30363d;text-align:left; }
        th { background:#161b22; }
        tr:hover { background:#1f2937; }
        .yes { color:#3fb950;font-weight:bold; }
        .no { color:#f85149; }
        button { background:#238636;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer; }
        button:hover { background:#2ea043; }
      </style>
    </head>
    <body>
      <h1>Админка Vikhrify</h1>
      <table>
        <tr><th>Юзер</th><th>Премиум</th><th>Галочка</th><th>Баланс</th><th>Действие</th></tr>
        ${usersList.map(u => `
          <tr>
            <td>@${u.username}</td>
            <td class="${u.premium ? 'yes' : 'no'}">${u.premium ? 'Да' : 'Нет'}</td>
            <td class="${u.verified ? 'yes' : 'no'}">${u.verified ? '✓' : '—'}</td>
            <td>${u.balance} VXR</td>
            <td>
              ${!u.verified ? <button onclick="fetch('/admin/verify?user=${u.username}&pass=sehpy9-qiqjux-hofgyN').then(r=>location.reload())">Выдать галку</button> : 'Уже есть'}
            </td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `);
});

// Выдать галочку (только админ)
app.get('/admin/verify', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') return res.status(403).send('Нет');
  const username = req.query.user;
  if (users ) users .verified = true;
  res.send('Галка выдана');
  });

app.listen(PORT, () => console.log(`Работает на ${PORT}`));
