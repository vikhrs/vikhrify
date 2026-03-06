import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Главный маршрут - принудительно отдаем index.html
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Маршрут для получения данных (умные кнопки будут стучаться сюда)
app.get('/api/data', (req, res) => {
    res.json({
        posts: [{name: "Admin", content: "Добро пожаловать в Vikhrify!"}],
        user: {name: "Гость", followers: 10}
    });
});

app.listen(3000, () => console.log('Сервер запущен на 3000 порту'));
