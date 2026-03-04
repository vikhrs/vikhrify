const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let posts = [];
let stories = [];

io.on('connection', (socket) => {
  console.log('Пользователь подключился');

  // Отправляем текущие посты новому пользователю
  socket.emit('postsUpdate', posts);

  // Новый пост
  socket.on('newPost', (data) => {
    const post = {
      id: Date.now(),
      username: data.username,
      text: data.text,
      time: new Date().toLocaleTimeString('ru-RU')
    };
    posts.unshift(post);
    io.emit('postsUpdate', posts);
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер Vikhrify запущен на порту ${PORT}`);
});
