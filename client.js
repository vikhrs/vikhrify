// client.js (Frontend JS for index.html)
let token = localStorage.getItem('token');
let currentUser = null;
let currentChat = null;
let subscriptions = []; // For push

if (token) {
  fetchUser();
  showMain();
} else {
  showAuth();
}

function toggleForms() {
  const reg = document.getElementById('register-form');
  const log = document.getElementById('login-form');
  reg.style.display = reg.style.display === 'none' ? 'block' : 'none';
  log.style.display = log.style.display === 'none' ? 'block' : 'none';
}

async function register() {
  const name = document.getElementById('reg-name').value;
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const res = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    showMain();
  } else {
    alert(data.error);
  }
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    showMain();
  } else {
    alert(data.error);
  }
}

function showAuth() {
  document.getElementById('auth-screen').style.display = 'block';
  document.getElementById('main-screen').style.display = 'none';
}

async function showMain() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
  await fetchUser();
  showFeed();
  setupSocket();
  setupPush();
}

async function fetchUser() {
  const res = await fetch('/profile/' + currentUser?.username || 'me', { // Adjust to get own
    headers: { Authorization: `Bearer ${token}` }
  });
  currentUser = await res.json();
}

function toggleMenu() {
  const menu = document.getElementById('burger-menu');
  menu.classList.toggle('menu-closed');
}

async function publishPost() {
  const content = prompt('Пост:');
  if (content) {
    await fetch('/publish-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content })
    });
    showFeed();
  }
}

async function searchUser() {
  const username = document.getElementById('search-username').value;
  const res = await fetch(`/search/${username}`, { headers: { Authorization: `Bearer ${token}` } });
  const users = await res.json();
  const results = document.getElementById('search-results');
  results.innerHTML = '';
  users.forEach(u => {
    const div = document.createElement('div');
    div.innerHTML = `<img src="${u.avatar || 'default.png'}" width="50"><p>${u.name} @${u.username} Подписчиков: ${u.followersCount}</p><button onclick="follow('${u._id}')">Подписаться</button><button onclick="startChat('${u._id}')">Написать</button>`;
    results.appendChild(div);
  });
}

async function follow(id) {
  await fetch('/follow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetId: id })
  });
}

function startChat(id) {
  // Find or create chat
  loadChats();
  // Open chat window with id
}

async function showFeed() {
  hideAllTabs();
  document.getElementById('feed').style.display = 'block';
  const res = await fetch('/feed', { headers: { Authorization: `Bearer ${token}` } });
  const posts = await res.json();
  const list = document.getElementById('posts-list');
  list.innerHTML = '';
  posts.forEach(p => {
    const div = document.createElement('div');
    div.innerHTML = `<p onclick="viewProfile('${p.author.username}')">${p.author.name} @${p.author.username}</p><p>${p.content}</p><button onclick="likePost('${p._id}')">Лайк (${p.likes.length})</button>`;
    list.appendChild(div);
  });
}

async function likePost(id) {
  // Implement like endpoint if needed
}

async function showChats() {
  hideAllTabs();
  document.getElementById('chats').style.display = 'block';
  await loadChats();
}

async function loadChats() {
  const res = await fetch('/chats/' + currentUser._id, { headers: { Authorization: `Bearer ${token}` } });
  const chats = await res.json();
  const list = document.getElementById('chats-list');
  list.innerHTML = '';
  chats.forEach(c => {
    const div = document.createElement('div');
    div.innerHTML = `<p onclick="openChat('${c.id}')">${c.other.name} @${c.other.username}</p><p>${c.lastMessage}</p>`;
    list.appendChild(div);
  });
}

async function openChat(chatId) {
  currentChat = chatId;
  document.getElementById('chat-window').style.display = 'block';
  const res = await fetch(`/chat/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
  const messages = await res.json();
  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML = '';
  messages.forEach(m => {
    msgs.innerHTML += `<p>${m.sender === currentUser._id ? 'You' : 'Them'}: ${m.content}</p>`;
  });
}

async function sendMessage() {
  const content = document.getElementById('chat-input').value;
  await fetch('/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetId: currentChat.participants.find(p => p !== currentUser._id), content }) // Adjust
  });
  document.getElementById('chat-input').value = '';
  openChat(currentChat);
}

async function showProfile() {
  hideAllTabs();
  document.getElementById('profile').style.display = 'block';
  document.getElementById('profile-avatar').src = currentUser.avatar || 'default.png';
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-username').textContent = `@${currentUser.username}`;
  document.getElementById('profile-followers').textContent = `Подписчиков: ${currentUser.followersCount}`;
  const postsDiv = document.getElementById('profile-posts');
  postsDiv.innerHTML = '';
  currentUser.posts.forEach(p => {
    postsDiv.innerHTML += `<p>${p.content}</p>`;
  });
}

async function viewProfile(username) {
  const res = await fetch(`/profile/${username}`, { headers: { Authorization: `Bearer ${token}` } });
  const profile = await res.json();
  // Show in modal or navigate
  alert(`Profile: ${profile.name} @${profile.username} Followers: ${profile.followersCount}`);
  // Display posts etc.
}

async function editProfile() {
  const name = prompt('Новое имя:');
  const file = prompt('Avatar file path:'); // Use file input in real
  const formData = new FormData();
  formData.append('name', name);
  // formData.append('avatar', file);
  await fetch('/update-profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  showProfile();
}

function hideAllTabs() {
  document.getElementById('feed').style.display = 'none';
  document.getElementById('chats').style.display = 'none';
  document.getElementById('profile').style.display = 'none';
}

function logout() {
  localStorage.removeItem('token');
  showAuth();
}

function switchAccount() {
  // List accounts, switch token
}

function setupSocket() {
  const socket = io();
  socket.emit('join', currentUser._id);
  socket.on('new-post', () => showFeed());
  socket.on('new-message', (msg) => {
    if (currentChat) openChat(currentChat);
    // Notify
  });
}

async function setupPush() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    await navigator.serviceWorker.register('/sw.js');
    const subscription = await navigator.serviceWorker.ready.then(reg => reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array('YOUR_PUBLIC_VAPID')
    }));
    await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(subscription)
    });
  }
}

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}