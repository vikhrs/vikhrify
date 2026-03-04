const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// База в памяти (для Render)
const users = {};          // { socket.id: { username, balance, verified, banned, posts: [] } }
const posts = [];          // { id, user, text, type, time }

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);

  socket.on('register', (username) => {
    if (!username || username.length < 3) {
      socket.emit('error', 'Имя должно быть минимум 3 символа');
      return;
    }

    if (Object.values(users).some(u => u.username === username)) {
      socket.emit('error', 'Такое имя уже занято');
      return;
    }

    users[socket.id] = {
      username,
      balance: 100,
      verified: false,
      banned: false,
      posts: []
    };

    socket.emit('login_success', {
      username,
      balance: 100,
      verified: false
    });

    io.emit('user_list', getUserList());
  });

  socket.on('post_text', (text) => {
    const user = users[socket.id];
    if (!user || user.banned) return;

    const post = {
      id: Date.now(),
      user: user.username,
      text,
      type: 'text',
      time: new Date().toLocaleString('ru-RU')
    };

    posts.push(post);
    user.posts.push(post);

    io.emit('new_post', post);

    user.balance += 1;
    socket.emit('update_balance', user.balance);
  });

  socket.on('get_profile', (targetUsername) => {
    const target = Object.values(users).find(u => u.username === targetUsername);
    if (target) {
      socket.emit('profile_data', {
        username: target.username,
        balance: target.balance,
        verified: target.verified,
        posts: target.posts
      });
    } else {
      socket.emit('error', 'Пользователь не найден');
    }
  });

  socket.on('get_all_users', () => {
    socket.emit('user_list', getUserList());
  });

  socket.on('admin_action', ({ action, username, value }) => {
    if (value !== 'sehpy9-qiqjux-hofgyN') return socket.emit('error', 'Доступ запрещён');

    const target = Object.values(users).find(u => u.username === username);
    if (!target) return;

    if (action === 'verify') target.verified = true;
    else if (action === 'unverify') target.verified = false;
    else if (action === 'ban') target.banned = true;
    else if (action === 'unban') target.banned = false;
    else if (action === 'add_balance') target.balance += Number(value) || 0;

    const targetSocketId = Object.keys(users).find(id => users[id].username === username);
    if (targetSocketId) {
      io.to(targetSocketId).emit('update_user', target);
    }

    socket.emit('admin_success', 'Действие выполнено');
    io.emit('user_list', getUserList());
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
    delete users[socket.id];
    io.emit('user_list', getUserList());
  });
});

function getUserList() {
  return Object.values(users).map(u => ({
    username: u.username,
    balance: u.balance,
    verified: u.verified,
    banned: u.banned
  }));
}

server.listen(PORT, () => {
  console.log(`Vikhrify запущен на порту ${PORT}`);
});
