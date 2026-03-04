const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data.json');

let data = { users: {}, posts: [] };
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {}
}
const users = data.users;
const posts = data.posts;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'Заполни поля' });
  if (users ) return res.json({ success: false, error: 'Юзернейм занят' });

  users = { password, balance: 1000, verified: false, premiumUntil: null };
  saveData();
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!users || users .password !== password) {
    return res.json({ success: false, error: 'Неверно' });
  }
  res.json({ success: true, username });
});

app.get('/posts', (req, res) => res.json(posts));

app.post('/posts', (req, res) => {
  const { username, text } = req.body;
  if (!users ) return res.json({ success: false, error: 'Войди' });
  posts.unshift({ id: Date.now(), username, text, likes: 0, comments: [] });
  saveData();
  res.json({ success: true });
});

app.get('/admin', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') {
    return res.status(403).send('<h1 style="color:red;text-align:center">Пароль неверный, пиздуй</h1>');
  }

  const userList = Object.entries(users).map(( ) => ({
    username,
    verified: u.verified,
    balance: u.balance || 0,
    premium: !!u.premiumUntil
  }));

  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head><meta charset="UTF-8"><title>Admin Vikhrify</title>
    <style>
      body { background:#0d1117;color:#c9d1d9;font-family:Arial;padding:20px; }
      h1 { color:#58a6ff;text-align:center; }
      table { width:100%;border-collapse:collapse; }
      th,td { padding:12px;border:1px solid #30363d; }
      th { background:#161b22; }
      tr:hover { background:#1f2937; }
      .yes { color:#3fb950;font-weight:bold; }
      .no { color:#f85149; }
      button { background:#238636;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer; }
      input { padding:6px;width:80px;background:#222;color:white;border:1px solid #444; }
    </style>
    </head>
    <body>
      <h1>Админка Vikhrify</h1>
      <table>
        <tr><th>@Юзер</th><th>Галочка</th><th>Баланс</th><th>Действия</th></tr>
        ${userList.map(u => `
          <tr>
            <td>@${u.username}</td>
            <td class="${u.verified ? 'yes' : 'no'}">${u.verified ? '✓' : '—'}</td>
            <td>${u.balance} VXR</td>
            <td>
              <input id="amt_${u.username}" type="number" placeholder="Сумма" min="1">
              <button onclick="give('${u.username}')">Дать VXR</button>
              ${!u.verified ? <button onclick="verify('${u.username}')">Выдать галку</button> : ''}
            </td>
          </tr>
        `).join('')}
      </table>
      <script>
        function give(username) {
          const amt = document.getElementById('amt_' + username).value;
          if (!amt) return alert('Введи сумму');
          fetch('/admin/tokens?user=' + username + '&amt=' + amt + '&pass=sehpy9-qiqjux-hofgyN')
            .then(r => r.text()).then(alert).then(() => location.reload());
        }
        function verify(username) {
          fetch('/admin/verify?user=' + username + '&pass=sehpy9-qiqjux-hofgyN')
            .then(r => r.text()).then(alert).then(() => location.reload());
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/admin/verify', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') return res.send('Нет доступа');
  const u = req.query.user;
  if (users ) users .verified = true;
  saveData();
  res.send('Галка выдана');
});

app.get('/admin/tokens', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') return res.send('Нет доступа');
  const u = req.query.user;
  const amt = parseInt(req.query.amt);
  if (users && !isNaN(amt) && amt > 0) {
    users .balance += amt;
    saveData();
    res.send(`Дал ${amt} VXR`);
  } else {
    res.send('Ошибка');
  }
});

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users, posts }, null, 2));
}

app.listen(PORT, () => console.log(`Сервер на ${PORT}`));
