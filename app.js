const API_URL = "http://localhost:3000";
let currentUser = null;
let currentPage = 1;
let currentSearch = "";
let currentDetailId = null;

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showNewsList();
        updateNav();
    }
});

// --- AUTH ---
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        updateNav();
        showNewsList();
    } else {
        document.getElementById('login-error').innerText = data.message;
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
        alert("Registration successful! Please login.");
        toggleAuth('login');
    } else {
        const data = await res.json();
        document.getElementById('reg-error').innerText = data.message;
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

function toggleAuth(view) {
    document.getElementById('login-form').classList.toggle('hidden', view !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', view !== 'register');
}

function updateNav() {
    document.getElementById('user-display').innerText = `Hello, ${currentUser.username}`;
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('auth-page').classList.add('hidden');
}

// --- API WRAPPER (Auto-attach Token) ---
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 || res.status === 403) {
        alert("Session expired or unauthorized.");
        logout();
        return null;
    }
    return res;
}

// --- NEWS FEED & PAGINATION ---
let debounceTimer;
function handleSearch(val) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        currentSearch = val;
        currentPage = 1;
        fetchNews();
    }, 500); // Debounce API calls
}

function changePage(dir) {
    currentPage += dir;
    fetchNews();
}

async function fetchNews() {
    const res = await fetch(`${API_URL}/news?page=${currentPage}&limit=5&search=${currentSearch}`);
    const { data, page, totalPages } = await res.json();
    
    const container = document.getElementById('news-container');
    container.innerHTML = "";

    if (data.length === 0) container.innerHTML = "<p>No news found.</p>";

    data.forEach(news => {
        const isOwner = currentUser && (currentUser.id === news.author_id || currentUser.role === 'admin');
        container.innerHTML += `
            <div class="card">
                <h3>${news.title}</h3>
                <small>By ${news.author_name}</small>
                <p>${news.body.substring(0, 100)}...</p>
                <button onclick="viewDetails(${news.id})">Read More</button>
                ${isOwner ? `<button onclick="editNews(${news.id})">Edit</button>
                             <button onclick="deleteNews(${news.id})" style="color:red">Delete</button>` : ''}
            </div>
        `;
    });

    document.getElementById('page-info').innerText = `Page ${page} of ${totalPages || 1}`;
    document.getElementById('prev-btn').disabled = page <= 1;
    document.getElementById('next-btn').disabled = page >= totalPages;
}

function showNewsList() {
    hideAll();
    document.getElementById('news-list-page').classList.remove('hidden');
    fetchNews();
}

// --- CRUD OPERATIONS ---
async function submitNews() {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('news-title').value;
    const body = document.getElementById('news-body').value;
    
    const url = id ? `${API_URL}/news/${id}` : `${API_URL}/news`;
    const method = id ? 'PATCH' : 'POST';

    await authFetch(url, { method, body: JSON.stringify({ title, body }) });
    showNewsList();
}

async function deleteNews(id) {
    if (!confirm("Are you sure?")) return;
    await authFetch(`${API_URL}/news/${id}`, { method: 'DELETE' });
    fetchNews();
}

async function editNews(id) {
    const res = await authFetch(`${API_URL}/news/${id}`);
    const news = await res.json();
    
    hideAll();
    document.getElementById('news-form-page').classList.remove('hidden');
    document.getElementById('form-title').innerText = "Edit News";
    document.getElementById('edit-id').value = news.id;
    document.getElementById('news-title').value = news.title;
    document.getElementById('news-body').value = news.body;
}

function showCreatePage() {
    hideAll();
    document.getElementById('news-form-page').classList.remove('hidden');
    document.getElementById('form-title').innerText = "Create News";
    document.getElementById('edit-id').value = "";
    document.getElementById('news-title').value = "";
    document.getElementById('news-body').value = "";
}

// --- DETAILS & COMMENTS ---
async function viewDetails(id) {
    currentDetailId = id;
    hideAll();
    document.getElementById('detail-page').classList.remove('hidden');
    
    const res = await authFetch(`${API_URL}/news/${id}`);
    const news = await res.json();
    
    const commentsHtml = news.comments.map(c => 
        `<div style="border-top:1px solid #eee; margin-top:5px;">
            <small><b>${c.username}</b> - ${new Date(c.timestamp).toLocaleDateString()}</small>
            <p>${c.text}</p>
         </div>`
    ).join('');

    document.getElementById('detail-content').innerHTML = `
        <h1>${news.title}</h1>
        <p>By ${news.author_name}</p>
        <hr>
        <p>${news.body}</p>
        <h3>Comments</h3>
        ${commentsHtml}
    `;
}

async function submitComment() {
    const text = document.getElementById('comment-text').value;
    if (!text) return;
    
    await authFetch(`${API_URL}/news/${currentDetailId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text })
    });
    
    document.getElementById('comment-text').value = "";
    viewDetails(currentDetailId);
}

function hideAll() {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
}