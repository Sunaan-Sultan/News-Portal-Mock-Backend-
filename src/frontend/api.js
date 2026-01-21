import { API_URL } from './config.js';

async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    alert('Session expired or unauthorized.');
    localStorage.clear();
    return null;
  }
  return res;
}

async function login(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res;
}

async function register(username, password) {
  return fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
}

async function fetchNews({ page = 1, limit = 5, search = '' } = {}) {
  return fetch(`${API_URL}/news?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
}

async function getNews(id) {
  return authFetch(`${API_URL}/news/${id}`);
}

async function createNews({ title, body }) {
  return authFetch(`${API_URL}/news`, { method: 'POST', body: JSON.stringify({ title, body }) });
}

async function updateNews(id, { title, body }) {
  return authFetch(`${API_URL}/news/${id}`, { method: 'PATCH', body: JSON.stringify({ title, body }) });
}

async function deleteNews(id) {
  return authFetch(`${API_URL}/news/${id}`, { method: 'DELETE' });
}

async function addComment(id, text) {
  return authFetch(`${API_URL}/news/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
}

export { authFetch, login, register, fetchNews, getNews, createNews, updateNews, deleteNews, addComment };
