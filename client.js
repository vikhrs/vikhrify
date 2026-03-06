// client.js

const token = localStorage.getItem('token');
let currentUser = null;
let currentChat = null;
let socket = null;

const API_BASE = '';  // если сервер на том же домене, оставь пустым

// Показать экран авторизации / основной экран при загрузке
window.addEventListener('load', () => {
    if (token) {
        showMainScreen();
    } else {
        document.getElementById('auth-screen').style.display = 'block';
        document.getElementById('main-screen').style.display = 'none';
    }
});

async function register() {
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('reg-error');

    errorEl.style.display = 'none';

    if (!name || !username || password.length < 6) {
        errorEl.textContent = "Заполните все поля. Пароль минимум 6 символов";
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(API_BASE + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            localStorage.setItem('token', data.token);
            showMainScreen();
        } else {
            errorEl.textContent = data.error || "Ошибка регистрации (возможно username занят)";
            errorEl.style.display = 'block';
        }
    } catch (err) {
        console.error('Register error:', err);
        errorEl.textContent = "Ошибка соединения с сервером";
        errorEl.style.display = 'block';
    }
}

async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    errorEl.style.display = 'none';

    if (!username || !password) {
        errorEl.textContent = "Введите username и пароль";
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(API_BASE + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            localStorage.setItem('token', data.token);
            showMainScreen();
        } else {
            errorEl.textContent = data.error || "Неверный логин или пароль";
            errorEl.style.display = 'block';
        }
    } catch (err) {
        console.error('Login error:', err);
        errorEl.textContent = "Ошибка соединения с сервером";
        errorEl.style.display = 'block';
    }
}

function toggleForms() {
    const regForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const toggleLink = document.getElementById('toggle-link');

    if (regForm.style.display !== 'none') {
        regForm.style.display = 'none';
        loginForm.style.display = 'block';
        toggleLink.textContent = "Нет аккаунта? Зарегистрироваться";
    } else {
        regForm.style.display = 'block';
        loginForm.style.display = 'none';
        toggleLink.textContent = "Уже есть аккаунт? Войти";
    }
}

async function showMainScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';

    try {
        await loadCurrentUser();
        showFeed();          // или showChats(), в зависимости от того, что хочешь по умолчанию
        setupSocket();
        // setupPush();      // если push уже готов — раскомментируй
    } catch (err) {
        console.error('Ошибка загрузки после входа:', err);
        alert('Не удалось загрузить данные. Попробуйте войти заново.');
        logout();
    }
}

async function loadCurrentUser() {
    const res = await fetch(API_BASE + '/profile/me', {  // предполагаем, что есть маршрут /profile/me для себя
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) throw new Error('Failed to load profile');

    currentUser = await res.json();
    console.log('Текущий пользователь загружен:', currentUser.username);
    
    // Можно обновить UI профиля здесь, если нужно
}

function setupSocket() {
    if (!currentUser?._id) return;

    socket = io(API_BASE || undefined);  // если на том же домене — без аргументов

    socket.on('connect', () => {
        console.log('Socket подключён');
        socket.emit('join', currentUser._id);
    });

    socket.on('new-post', () => {
        console.log('Новый пост — обновляем ленту');
        showFeed();
    });

    socket.on('new-message', (msg) => {
        console.log('Новое сообщение:', msg);
        if (currentChat) {
            openChat(currentChat);
        }
        // Здесь можно добавить уведомление в UI
    });
}

// Пример функции выхода (добавь кнопку в бургер-меню)
function logout() {
    localStorage.removeItem('token');
    if (socket) socket.disconnect();
    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'block';
    currentUser = null;
}

// Добавь свои остальные функции ниже (showFeed, showChats, publishPost и т.д.)
// Они должны быть такими же, как раньше, но с проверками:

async function showFeed() {
    if (!token) return;

    try {
        const res = await fetch(API_BASE + '/feed', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load feed');
        
        const posts = await res.json();
        const list = document.getElementById('posts-list');
        list.innerHTML = '';

        posts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'post';
            div.innerHTML = `
                <p onclick="viewProfile('${p.author?.username || ''}')">
                    ${p.author?.name || 'Unknown'} @${p.author?.username || 'unknown'}
                </p>
                <p>${p.content || ''}</p>
            `;
            list.appendChild(div);
        });
    } catch (err) {
        console.error('Ошибка загрузки ленты:', err);
    }
}

// ... остальные твои функции (publishPost, searchUser, startChat и т.д.) ...

// Для отладки можно добавить в конец файла:
console.log('client.js загружен успешно');