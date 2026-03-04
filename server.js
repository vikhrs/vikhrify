import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public')); // папка public для index.html и статики
app.use(express.json());

// Настройка отправки почты
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Временное хранилище кодов (email → {code, expires})
const codes = new Map();

// Отправить код
app.post('/api/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Некорректный email' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  codes.set(email, {
    code,
    expires: Date.now() + 10 * 60 * 1000, // 10 минут
  });

  const mailOptions = {
    from: `"Vikhrify" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Код входа в Vikhrify',
    text: `Ваш код: ${code}\nДействует 10 минут.`,
    html: `
      <h2>Викхрайфай</h2>
      <p>Код подтверждения: <b style="font-size:24px; letter-spacing:4px;">${code}</b></p>
      <p>Действителен 10 минут. Никому не показывайте.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка отправки почты:', err.message);
    res.status(500).json({ success: false, message: 'Не удалось отправить код' });
  }
});

// Проверить код
app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;

  const data = codes.get(email);

  if (!data) {
    return res.status(400).json({ success: false, message: 'Код не найден или просрочен' });
  }

  if (Date.now() > data.expires) {
    codes.delete(email);
    return res.status(400).json({ success: false, message: 'Код просрочен' });
  }

  if (data.code !== code) {
    return res.status(400).json({ success: false, message: 'Неверный код' });
  }

  codes.delete(email);
  res.json({ success: true });
});

// Socket.io — для чата и обновлений
io.on('connection', (socket) => {
  console.log('Пользователь подключился');

  socket.on('login', (email) => {
    socket.email = email;
    io.emit('userOnline', email);
  });

  socket.on('newPost', (post) => {
    io.emit('newPost', { ...post, time: new Date().toLocaleTimeString() });
  });

  socket.on('disconnect', () => {
    if (socket.email) io.emit('userOffline', socket.email);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
