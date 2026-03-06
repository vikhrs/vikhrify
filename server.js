import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

let users = []; let posts = []; let chats = [];

async function loadData() {
    try {
        users = JSON.parse(await fs.readFile(join(__dirname, 'users.json'), 'utf8'));
        posts = JSON.parse(await fs.readFile(join(__dirname, 'posts.json'), 'utf8'));
    } catch (e) { users = []; posts = []; }
}
await loadData();

// Эндпоинты для чатов и админки
app.get('/api/users', (req, res) => res.json(users));
app.post('/api/admin/action', async (req, res) => {
    const { userId, type, value } = req.body;
    const user = users.find(u => u.id === Number(userId));
    if (user) {
        if (type === 'ban') user.isBlocked = value;
        if (type === 'boost') user.followers = (user.followers || 0) + Number(value);
        await fs.writeFile('users.json', JSON.stringify(users, null, 2));
    }
    res.json({ success: true });
});

app.listen(3000, () => console.log('Сервер запущен!'));
