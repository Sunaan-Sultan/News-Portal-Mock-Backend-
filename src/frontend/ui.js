import * as api from './api.js';
import * as auth from './auth.js';

let state = { currentUser: null, currentPage: 1, currentSearch: '', currentDetailId: null };

function hideAll() {
  document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
}

function updateNav() {
  const user = state.currentUser;
  if (!user) return;
  document.getElementById('user-display').innerText = `Hello, ${user.username}`;
  document.getElementById('logout-btn').classList.remove('hidden');
  document.getElementById('auth-page').classList.add('hidden');
}

function renderNewsList(dataObj) {
  const { data, page, totalPages } = dataObj;
  const container = document.getElementById('news-container');
  container.innerHTML = '';
  if (!data || data.length === 0) container.innerHTML = '<p>No news found.</p>';

  data.forEach(news => {
    const isOwner = state.currentUser && (state.currentUser.id === news.author_id || state.currentUser.role === 'admin');
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${news.title}</h3>
      <small>By ${news.author_name}</small>
      <p>${news.body.substring(0,100)}...</p>
      <button data-id="${news.id}" class="read-btn">Read More</button>
      ${isOwner ? `<button data-id="${news.id}" class="edit-btn">Edit</button>
                   <button data-id="${news.id}" class="delete-btn" style="color:red">Delete</button>` : ''}
    `;
    container.appendChild(card);
  });

  document.getElementById('page-info').innerText = `Page ${page} of ${totalPages || 1}`;
  document.getElementById('prev-btn').disabled = page <= 1;
  document.getElementById('next-btn').disabled = page >= totalPages;

  // attach delegated handlers
  container.querySelectorAll('.read-btn').forEach(b => b.addEventListener('click', e => viewDetails(e.target.dataset.id)));
  container.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', e => editNews(e.target.dataset.id)));
  container.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => deleteNews(e.target.dataset.id)));
}

async function fetchAndRenderNews() {
  const res = await api.fetchNews({ page: state.currentPage, limit: 5, search: state.currentSearch });
  const dataObj = await res.json();
  renderNewsList(dataObj);
}

function showNewsList() {
  hideAll();
  document.getElementById('news-list-page').classList.remove('hidden');
  fetchAndRenderNews();
}

async function submitNews() {
  const id = document.getElementById('edit-id').value;
  const title = document.getElementById('news-title').value;
  const body = document.getElementById('news-body').value;
  if (id) {
    await api.updateNews(id, { title, body });
  } else {
    await api.createNews({ title, body });
  }
  showNewsList();
}

async function deleteNews(id) {
  if (!confirm('Are you sure?')) return;
  await api.deleteNews(id);
  fetchAndRenderNews();
}

async function editNews(id) {
  const res = await api.getNews(id);
  const news = await res.json();
  hideAll();
  document.getElementById('news-form-page').classList.remove('hidden');
  document.getElementById('form-title').innerText = 'Edit News';
  document.getElementById('edit-id').value = news.id;
  document.getElementById('news-title').value = news.title;
  document.getElementById('news-body').value = news.body;
}

function showCreatePage() {
  hideAll();
  document.getElementById('news-form-page').classList.remove('hidden');
  document.getElementById('form-title').innerText = 'Create News';
  document.getElementById('edit-id').value = '';
  document.getElementById('news-title').value = '';
  document.getElementById('news-body').value = '';
}

async function viewDetails(id) {
  state.currentDetailId = id;
  hideAll();
  document.getElementById('detail-page').classList.remove('hidden');
  const res = await api.getNews(id);
  const news = await res.json();

  const commentsHtml = news.comments.map(c => `
    <div style="border-top:1px solid #eee; margin-top:5px;">
      <small><b>${c.username}</b> - ${new Date(c.timestamp).toLocaleDateString()}</small>
      <p>${c.text}</p>
    </div>`).join('');

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
  await api.addComment(state.currentDetailId, text);
  document.getElementById('comment-text').value = '';
  viewDetails(state.currentDetailId);
}

let debounceTimer;
function handleSearch(val) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.currentSearch = val;
    state.currentPage = 1;
    fetchAndRenderNews();
  }, 500);
}

function changePage(dir) {
  state.currentPage += dir;
  fetchAndRenderNews();
}

export function setCurrentUser(user) {
  state.currentUser = user;
}

export { hideAll, updateNav, showNewsList, submitNews, deleteNews, editNews, showCreatePage, viewDetails, submitComment, handleSearch, changePage };
