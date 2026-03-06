import express from 'express';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(import.meta.url);
const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.static(__dirname));

let db = { users: [], posts: [], chats: [] };

// Профессиональная загрузка и сохранение
async function syncDB() {
    try {
        const u = await fs.readFile(join(__dirname, 'users.json'), 'utf8');
        const p = await fs.readFile(join(__dirname, 'posts.json'), 'utf8');
        const c = await fs.readFile(join(__dirname, 'chats.json'), 'utf8');
        db = { users: JSON.parse(u), posts: JSON.parse(p), chats: JSON.parse(c) };
    } catch { db = { users: [], posts: [], chats: [] }; }
}
await syncDB();

async function commit() {
    await fs.writeFile(join(__dirname, 'users.json'), JSON.stringify(db.users, null, 2));
    await fs.writeFile(join(__dirname, 'posts.json'), JSON.stringify(db.posts, null, 2));
    await fs.writeFile(join(__dirname, 'chats.json'), JSON.stringify(db.chats, null, 2));
}

// Полноценный API
app.get('/api/sync', (req, res) => res.json(db));

app.post('/api/admin/action', async (req, res) => {
    const { userId, type, value } = req.body;
    const u = db.users.find(x => x.id === userId);
    if(u) {
        if(type === 'ban') u.isBanned = value;
        if(type === 'verify') u.isVerified = value;
        await commit();
    }
    res.json({ success: true });
});

app.post('/api/chat', async (req, res) => {
    db.chats.push({ ...req.body, ts: Date.now() });
    await commit();
    res.json({ success: true });
});

app.listen(3000, () => console.log('Vikhrify Messenger Engine v1.0.0 is running'));
