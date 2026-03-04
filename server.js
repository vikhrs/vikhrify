const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // npm install node-fetch

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Твои ключи от Platega.io — замени на реальные!
const PLATEGA_MERCHANT_ID = 'ТВОЙ_MERCHANT_ID';
const PLATEGA_SECRET = 'ТВОЙ_SECRET_KEY';
const PLATEGA_API_URL = 'https://app.platega.io/api/v1/transactions';

app.use(express.json());
app.use(express.static(__dirname));

let data = { users: {} };

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {}
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Регистрация и вход — без изменений, как раньше
app.post('/api/register', (req, res) => {
  const { name, username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'Юзернейм и пароль обязательны' });

  const clean = username.trim().toLowerCase();
  if (data.users[clean]) return res.json({ success: false, error: 'Юзернейм занят' });

  const user = {
    id: Date.now().toString(),
    name: name?.trim() || clean,
    username: clean,
    password,
    balance: 1000,
    isPremium: false,
    badge: 'none',
    referralCode: Math.random().toString(36).slice(2,10).toUpperCase(),
    followers: 0,
    avatar: 'https://via.placeholder.com/80?text=User'
  };

  data.users[clean] = user;
  saveData();
  res.json({ success: true, user: { id: user.id, name: user.name, username: user.username, balance: user.balance } });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const clean = username.trim().toLowerCase();
  const user = data.users[clean];

  if (!user || user.password !== password) return res.json({ success: false, error: 'Неверный юзернейм или пароль' });

  res.json({ success: true, user: { id: user.id, name: user.name, username: user.username, balance: user.balance, isPremium: user.isPremium, badge: user.badge } });
});

// Покупка Premium
app.post('/api/buy-premium', (req, res) => {
  const { userId } = req.body;
  let user = null;
  for (let key in data.users) {
    if (data.users[key].id === userId) user = data.users[key];
  }
  if (!user || user.balance < 499) return res.json({ success: false, error: 'Недостаточно VXR' });

  user.balance -= 499;
  user.isPremium = true;
  user.badge = 'yellow';
  saveData();
  res.json({ success: true, user });
});

// Создание платежа через Platega.io
app.post('/api/create-platega-payment', async (req, res) => {
  const { amount, userId } = req.body;

  if (!amount || amount < 100) return res.json({ success: false, error: 'Минимум 100 ₽' });

  try {
    const orderId = `vxr_${Date.now()}_${userId}`;

    const payload = {
      amount: amount * 100,  // в копейках
      currency: 'RUB',
      description: 'Пополнение VXR в Vikhrify',
      order_id: orderId,
      success_url: `${req.headers.origin}/?payment=success`,
      fail_url: `${req.headers.origin}/?payment=cancel`,
      // callback_url: 'https://твой-домен/api/platega-callback' — добавь свой URL
    };

    const response = await fetch(PLATEGA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MerchantId': PLATEGA_MERCHANT_ID,
        'X-Secret': PLATEGA_SECRET
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.payment_url) {
      // Можно сохранить orderId и сумму для верификации в callback
      res.json({ success: true, paymentUrl: result.payment_url });
    } else {
      res.json({ success: false, error: result.message || 'Ошибка Platega' });
    }
  } catch (err) {
    console.error('Platega error:', err);
    res.json({ success: false, error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер на http://localhost:${PORT}`);
});
