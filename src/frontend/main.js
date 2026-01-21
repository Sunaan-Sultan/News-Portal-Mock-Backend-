import * as auth from './auth.js';
import * as ui from './ui.js';

// expose functions used by inline handlers in HTML
window.toggleAuth = (view) => {
  document.getElementById('login-form').classList.toggle('hidden', view !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', view !== 'register');
};

window.login = async () => {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const result = await auth.handleLogin(username, password);
  if (result.ok) {
    ui.setCurrentUser(result.user);
    ui.updateNav();
    ui.showNewsList();
  } else {
    document.getElementById('login-error').innerText = result.message;
  }
};

window.register = async () => {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const result = await auth.handleRegister(username, password);
  if (result.ok) {
    alert('Registration successful! Please login.');
    toggleAuth('login');
  } else {
    document.getElementById('reg-error').innerText = result.message;
  }
};

window.logout = () => {
  auth.logout();
  location.reload();
};

// Wire UI functions
window.handleSearch = ui.handleSearch;
window.changePage = ui.changePage;
window.showCreatePage = ui.showCreatePage;
window.submitNews = ui.submitNews;
window.deleteNews = ui.deleteNews;
window.editNews = ui.editNews;
window.viewDetails = ui.viewDetails;
window.submitComment = ui.submitComment;

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    const parsed = JSON.parse(user);
    ui.setCurrentUser(parsed);
    ui.updateNav();
    ui.showNewsList();
  }
});
