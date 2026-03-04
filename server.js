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
  } catch {}
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
  res.json({ success: true, username });
});

app.get('/posts', (req, res) => res.json(posts));

app.post('/posts', (req, res) => {
  const { username, text } = req.body;
  if (!users[username]) return res.json({ success: false, error: 'Войди' });
  posts.unshift({ id: Date.now(), username, text, likes: 0, comments: [] });
  saveData();
  res.json({ success: true });
});

// Админка — с +/− баланс и выдать/забрать галку
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
        body { background:#0d1117; color:#c9d1d9; font-family:Arial; padding:20px; }
        h1 { color:#58a6ff; text-align:center; }
        table { width:100%; border-collapse:collapse; margin-top:20px; }
        th,td { padding:12px; border:1px solid #30363d; text-align:left; }
        th { background:#161b22; }
        tr:hover { background:#1f2937; }
        .yes { color:#3fb950; font-weight:bold; }
        .no { color:#f85149; }
        button { background:#238636; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin:3px; }
        .minus { background:#f85149; }
        input { padding:6px; width:80px; background:#222; color:white; border:1px solid #444; border-radius:4px; }
      </style>
    </head>
    <body>
      <h1>Админка Vikhrify</h1>
      <table>
        <tr><th>@Юзер</th><th>Галочка</th><th>Баланс VXR</th><th>Премиум</th><th>Действия</th></tr>
        ${userList.map(u => `
          <tr>
            <td>@${u.username}</td>
            <td class="${u.verified ? 'yes' : 'no'}">${u.verified ? '✓' : '—'}</td>
            <td>${u.balance}</td>
            <td class="${u.premium ? 'yes' : 'no'}">${u.premium ? 'Да' : 'Нет'}</td>
            <td>
              <input id="amt_${u.username}" type="number" placeholder="Сумма" min="1">
              <button onclick="changeBalance('${u.username}', 1)">+</button>
              <button class="minus" onclick="changeBalance('${u.username}', -1)">-</button>
              ${u.verified 
                ? <button class="minus" onclick="verify('${u.username}', false)">Забрать галку</button> 
                : `<button onclick="verify('${u.username}', true)">Выдать галку</button>`}
            </td>
          </tr>
        `).join('')}
      </table>

      <script>
        function changeBalance(username, sign) {
          const amtInput = document.
          getElementById('amt_' + username);
          const amt = parseInt(amtInput.value);
          if (!amt || amt <= 0) return alert('Введи сумму >0');
          fetch('/admin/balance?user=' + username + '&amt=' + (sign * amt) + '&pass=sehpy9-qiqjux-hofgyN')
            .then(r => r.text())
            .then(text => alert(text))
            .then(() => location.reload());
        }
        function verify(username, setTo) {
          fetch('/admin/verify?user=' + username + '&set=' + setTo + '&pass=sehpy9-qiqjux-hofgyN')
            .then(r => r.text())
            .then(text => alert(text))
            .then(() => location.reload());
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/admin/verify', (req, res) => {
  if (req.query.pass !== 'sehpy9-qiqjux-hofgyN') return res.send('Нет доступа');
  const username = req.query.user;
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
    res.send(`Баланс изменён на ${amt} → ${users[username].balance} VXR`);
  } else {
    res.send('Ошибка');
  }
});

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users, posts }, null, 2));
}

app.listen(PORT, () => console.log(`Сервер на ${PORT}`));
