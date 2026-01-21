import * as api from './api.js';

let currentUser = null;

function loadUser() {
  const user = localStorage.getItem('user');
  currentUser = user ? JSON.parse(user) : null;
  return currentUser;
}

async function handleLogin(username, password) {
  const res = await api.login(username, password);
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    return { ok: true, user: data.user };
  }
  return { ok: false, message: data.message };
}

async function handleRegister(username, password) {
  const res = await api.register(username, password);
  if (res.ok) return { ok: true };
  const data = await res.json();
  return { ok: false, message: data.message };
}

function logout() {
  localStorage.clear();
  currentUser = null;
}

export { loadUser, handleLogin, handleRegister, logout };
