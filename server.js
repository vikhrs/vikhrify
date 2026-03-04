const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ users: [], posts: [], messages: [] }).write();

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

const loggedUsers = {};      // socket.id → username
const usernameToSocket = {}; // username → socket.id

function findUserByUsername(username) {
  return db.get('users').find({ username }).value();
}

function findUserByToken(token) {
  return db.get('users').find({ token }).value();
}

function saveUser(user) {
  db.get('users')
    .find({ username: user.username })
    .assign(user)
    .write();
}

io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  // Регистрация
  socket.on('register', async ({ username, password, ref }) => {
    if (!username  username.length < 3  !password || password.length < 4) {
      return socket.emit('error', 'Юзернейм минимум 3 символа, пароль минимум 4');
    }

    if (findUserByUsername(username)) {
      return socket.emit('error', 'Такой юзернейм уже занят');
    }

    const hash = await bcrypt.hash(password, 10);
    const referralCode = username + '-' + uuidv4().slice(0, 8);

    let referrer = null;
    if (ref) {
      referrer = db.get('users').find({ referralCode: ref }).value() ||
                 db.get('users').find({ username: ref }).value();
      if (referrer) {
        referrer.balance = (referrer.balance || 100) + 50;
        saveUser(referrer);
      }
    }

    const newUser = {
      id: uuidv4(),
      username,
      passwordHash: hash,
      displayName: username,
      avatar: null,
      balance: 100,
      premium: false,
      verified: false,
      banned: false,
      token: null,
      referralCode,
      createdAt: Date.now()
    };

    db.get('users').push(newUser).write();
    socket.emit('register_success', { message: 'Зарегистрировано! Теперь войдите.' });
  });

  // Вход
  socket.on('login', async ({ username, password }) => {
    const user = findUserByUsername(username);
    if (!user) {
      return socket.emit('error', 'Пользователь не найден');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch || user.banned) {
      return socket.emit('error', 'Неверный пароль или пользователь заблокирован');
    }

    const token = uuidv4();
    user.token = token;
    saveUser(user);

    loggedUsers[socket.id] = username;
    usernameToSocket[username] = socket.id;

    socket.emit('login_success', {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      balance: user.balance,
      premium: user.premium,
      verified: user.verified,
      referralCode: user.referralCode,
      token
    });
  });

  // Автовход по токену
  socket.on('auto_login', (token) => {
    const user = findUserByToken(token);
    if (user && !user.banned) {
      loggedUsers[socket.id] = user.username;
      usernameToSocket[user.username] = socket.id;

      socket.emit('login_success', {
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        balance: user.balance,
        premium: user.premium,
        verified: user.verified,
        referralCode: user.referralCode,
        token: user.token
      });
    } else {
      socket.emit('auto_login_fail');
    }
  });

  // Создание поста
  socket.on('post', ({ text, image, voice }) => {
    const username = loggedUsers[socket.id];
    if (!username) return;
    const user = findUserByUsername(username);
    if (!user || user.banned) return;

    if (voice && !user.premium) {
      return socket.emit('error', 'Голосовые посты доступны только премиум-пользователям');
    }

    const post = {
      id: uuidv4(),
      username,
      displayName: user.displayName,
      text: text || '',
      image: image || null,
      voice: voice || null,
      time: new Date().toLocaleString('ru-RU'),
      verified: user.verified
    };

    db.get('posts').push(post).write();
    io.emit('new_post', post);
  });

  // Запрос всех постов
  socket.on('get_posts', () => {
    const posts = db.get('posts')
      .sortBy(p => -new Date(p.time).getTime())
      .value();
    socket.emit('posts_list', posts);
  });

  // Отправка личного сообщения
  socket.on('send_message', ({ to, text }) => {
    const from = loggedUsers[socket.id];
    if (!from || !text?.trim()) return;

    const msg = {
      id: uuidv4(),
      from,
      to,
      text: text.trim(),
      time: new Date().toLocaleString('ru-RU')
    };

    db.get('messages').push(msg).write();

    socket.emit('new_message', msg);

    const toSocketId = usernameToSocket[to];
    if (toSocketId) {
      io.to(toSocketId).emit('new_message', msg);
    }
  });

  // Список чатов пользователя
  socket.on('get_chats', () => {
    const username = loggedUsers[socket.id];
    if (!username) return;

    const msgs = db.get('messages')
      .filter(m => m.from === username || m.to === username)
      .value();

    const chatPartners = [...new Set(
      msgs.map(m => m.from === username ? m.to : m.from)
    )];

    socket.emit('chats_list', chatPartners);
  });

  // Сообщения конкретного чата
  socket.on('get_chat_messages', (withUser) => {
    const username = loggedUsers[socket.id];
    if (!username) return;

    const msgs = db.get('messages')
      .filter(m =>
        (m.from === username && m.to === withUser) ||
        (m.from === withUser && m.to === username)
      )
      .sortBy('id')
      .value();

    socket.emit('chat_messages', msgs);
  });

  // Обновление профиля
  socket.on('update_profile', ({ displayName, avatar }) => {
    const username = loggedUsers[socket.id];
    const user = findUserByUsername(username);
    if (!user) return;

    if (displayName?.trim()) user.displayName = displayName.trim();
    if (avatar) user.avatar = avatar;

    saveUser(user);
    socket.emit('profile_updated', {
      displayName: user.displayName,
      avatar: user.avatar
    });
  });

  // Покупка премиум
  socket.on('buy_premium', () => {
    const username = loggedUsers[socket.id];
    const user = findUserByUsername(username);
    if (!user) return;

    if (user.balance < 299) {
      return socket.emit('error', 'Недостаточно VXR');
    }
    if (user.premium) {
      return socket.emit('error', 'У вас уже есть премиум');
    }

    user.balance -= 299;
    user.premium = true;
    saveUser(user);

    socket.emit('premium_bought', {
      balance: user.balance,
      premium: true
    });
  });

  // Админ-действия
  socket.on('admin_action', ({ action, username, adminPass, amount }) => {
    if (adminPass !== 'sehpy9-qiqjux-hofgyN') {
      return socket.emit('error', 'Неверный пароль администратора');
    }

    const user = findUserByUsername(username);
    if (!user) return socket.emit('error', 'Пользователь не найден');

    switch (action) {
      case 'verify':
        user.verified = true;
        break;
      case 'unverify':
        user.verified = false;
        break;
      case 'ban':
        user.banned = true;
        break;
      case 'unban':
        user.banned = false;
        break;
      case 'add_balance':
        user.balance += Number(amount) || 0;
        break;
      default:
        return socket.emit('error', 'Неизвестное действие');
    }

    saveUser(user);
    socket.emit('admin_success', 'Действие выполнено');
  });

  socket.on('get_all_users', () => {
    const usersList = db.get('users')
      .map(u => ({
        username: u.username,
        balance: u.balance,
        verified: u.
          verified,
        banned: u.banned
      }))
      .value();
    socket.emit('user_list', usersList);
  });

  socket.on('disconnect', () => {
    const username = loggedUsers[socket.id];
    if (username) {
      delete usernameToSocket[username];
    }
    delete loggedUsers[socket.id];
    console.log('Отключился:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Vikhrify запущен на порту ${PORT}`);
});
