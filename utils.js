const API = "http://localhost:3000";

function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}

function requireLogin() {
  if (!getUser()) {
    location.href = "login.html";
  }
}
