const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));
app.use(express.json());

let posts = [];
let stories = [];
const privateMsgs = {};
const users = new Map();           // socket.id → данные пользователя
const registeredUsers = new Set(); // все когда-либо заходившие

io.on('connection', (socket) => {
  socket.on('setUsername', (username) => {
    const isNew = !Array.from(users.values()).some(u => u.username === username);
    if (isNew) registeredUsers.add(username);

    users.set(socket.id, {
      username,
      premium: false,
      verified: false,
      vxr: 500
    });
    broadcastUsers();
    socket.emit('postsUpdate', posts);
    socket.emit('storiesUpdate', stories);
    if (username.toLowerCase() === 'admin') socket.emit('adminStats', getAdminStats());
  });

  socket.on('buyPremium', (method) => {
    const user = users.get(socket.id);
    if (!user) return;

    let success = false;
    if (method === 'vxr') {
      if (user.vxr >= 299) {
        user.vxr -= 299;
        success = true;
      }
    } else {
      success = true; // рубли и доллары — симуляция
    }

    if (success) {
      user.premium = true;
      user.verified = true;
      socket.emit('premiumActivated', { vxr: user.vxr, verified: true });
      broadcastUsers();
      if (user.username.toLowerCase() === 'admin') socket.emit('adminStats', getAdminStats());
    } else {
      socket.emit('premiumError', 'Недостаточно VXR!');
    }
  });

  // Посты
  socket.on('newPost', ({ text, isPremium }) => {
    const user = users.get(socket.id);
    if (!user) return;
    const post = {
      id: Date.now(),
      username: user.username,
      text,
      isPremium: !!isPremium,
      likes: 0,
      comments: [],
      time: new Date().toLocaleTimeString('ru-RU')
    };
    posts.unshift(post);
    io.emit('postsUpdate', posts);
  });

  socket.on('likePost', (id) => {
    const p = posts.find(x => x.id === id);
    if (p) { p.likes++; io.emit('postsUpdate', posts); }
  });

  socket.on('newComment', ({ postId, comment }) => {
    const p = posts.find(x => x.id === postId);
    const u = users.get(socket.id);
    if (p && u) {
      p.comments.push({ username: u.username, text: comment, time: new Date().toLocaleTimeString('ru-RU') });
      io.emit('postsUpdate', posts);
    }
  });

  // Истории
  socket.on('newStory', (text) => {
    const user = users.get(socket.id);
    if (!user || !user.premium) return;
    const story = { id: Date.now(), username: user.username, text, time: new Date().toLocaleTimeString('ru-RU') };
    stories.unshift(story);
    io.emit('storiesUpdate', stories);
    setTimeout(() => {
      stories = stories.filter(s => s.id !== story.id);
      io.emit('storiesUpdate', stories);
    }, 30000);
  });

  // Личные сообщения
  socket.on('startPrivateChat', (target) => {
    const me = users.get(socket.id);
    if (!me) return;
    const room = [me.username, target].sort().join('_');
    socket.join(room);
    socket.emit('privateHistory', privateMsgs[room] || []);
  });

  socket.on('privateMessage', ({ room, text }) => {
    const user = users.get(socket.id);
    if (!user) return;
    const msg = { from: user.username, text, time: new Date().toLocaleTimeString('ru-RU') };
    if (!privateMsgs[room]) privateMsgs[room] = [];
    privateMsgs[room].push(msg);
    io.to(room).emit('privateMessage', msg);
  });

  socket.on('getAdminStats', () => {
    const user = users.get(socket.id);
    if (user && user.username.toLowerCase() === 'admin') socket.emit('adminStats', getAdminStats());
  });

  socket.on('disconnect', () => {
    users.delete(socket.id);
    broadcastUsers();
  });
});

function getAdminStats() {
  const online = users.size;
  const premium = Array.from(users.values()).filter(u => u.premium).length;
  const verified = Array.from(users.values()).filter(u => u.verified).length;
  return { totalRegistered: registeredUsers.size, online, premium, verified };
}

function broadcastUsers() {
  const list = Array.from(users.values()).map(u => ({
    username: u.username,
    premium: u.premium,
    verified: u.verified
  }));
  io.emit('usersList', list);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Vikhrify запущен: http://localhost:${PORT}`));
