import express from 'express';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '50mb' }));

// База данных
let db = { users: [], posts: [], chats: [] };

async function loadDB() {
    try {
        db.users = JSON.parse(await fs.readFile(join(__dirname, 'users.json'), 'utf8'));
        db.posts = JSON.parse(await fs.readFile(join(__dirname, 'posts.json'), 'utf8'));
    } catch (e) { db = { users: [], posts: [] }; }
}
await loadDB();

async function saveDB() {
    await fs.writeFile(join(__dirname, 'users.json'), JSON.stringify(db.users, null, 2));
    await fs.writeFile(join(__dirname, 'posts.json'), JSON.stringify(db.posts, null, 2));
}

// Роуты API
app.post('/api/register', async (req, res) => {
    const { name, username, password } = req.body;
    if (db.users.find(u => u.username === username)) return res.json({ success: false, error: "Занят!" });
    const user = { id: Date.now(), name, username, password, followers: [] };
    db.users.push(user);
    await saveDB();
    res.json({ success: true, user });
});

app.post('/api/follow', async (req, res) => {
    const { followerId, targetId } = req.body;
    const target = db.users.find(u => u.id === targetId);
    if (target) {
        if (!target.followers.includes(followerId)) target.followers.push(followerId);
        else target.followers = target.followers.filter(id => id !== followerId);
        await saveDB();
    }
    res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(join(__dirname, 'index.html')));
app.get('/api/data', (req, res) => res.json(db));

app.listen(3000, () => console.log('Messenger Server Online'));
