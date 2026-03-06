// client.js (добавь эти функции или замени старые)

async function register() {
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('reg-error');

    if (!name || !username || !password) {
        errorEl.textContent = "Заполните все поля";
        errorEl.style.display = 'block';
        return;
    }

    errorEl.style.display = 'none';

    try {
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            localStorage.setItem('token', data.token);
            showMainScreen();
        } else {
            errorEl.textContent = data.error || "Ошибка регистрации";
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = "Нет соединения с сервером";
        errorEl.style.display = 'block';
    }
}

async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
        errorEl.textContent = "Заполните все поля";
        errorEl.style.display = 'block';
        return;
    }

    errorEl.style.display = 'none';

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            localStorage.setItem('token', data.token);
            showMainScreen();
        } else {
            errorEl.textContent = data.error || "Неверный username или пароль";
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = "Нет соединения с сервером";
        errorEl.style.display = 'block';
    }
}

function toggleForms() {
    const reg = document.getElementById('register-form');
    const log = document.getElementById('login-form');
    const link = document.getElementById('toggle-link');

    if (reg.style.display !== 'none') {
        reg.style.display = 'none';
        log.style.display = 'block';
        link.textContent = "Нет аккаунта? Зарегистрироваться";
    } else {
        reg.style.display = 'block';
        log.style.display = 'none';
        link.textContent = "Уже есть аккаунт? Войти";
    }
}

function showMainScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    // Здесь вызови свои функции загрузки (fetchUser, showFeed и т.д.)
    initApp();  // ← замени на свою функцию инициализации после логина
}

// При загрузке страницы проверяем токен
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    if (token) {
        showMainScreen();
    } else {
        document.getElementById('auth-screen').style.display = 'block';
    }
});