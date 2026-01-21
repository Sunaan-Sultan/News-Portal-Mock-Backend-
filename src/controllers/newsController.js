const express = require('express');
const DataService = require('../data/DataService');
const newsCache = require('../utils/cache');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET News (with Search, Pagination & Caching)
router.get('/', (req, res) => {
  const { page = 1, limit = 5, search = "" } = req.query;
  const cacheKey = `news_${page}_${limit}_${search}`;

  if (newsCache.has(cacheKey)) {
    return res.json(newsCache.get(cacheKey));
  }

  const db = DataService.readData();
  let results = db.news;

  if (search) {
    results = results.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));
  }

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedResults = results.slice(startIndex, endIndex);

  const response = {
    data: paginatedResults,
    total: results.length,
    page: parseInt(page),
    totalPages: Math.ceil(results.length / limit)
  };

  newsCache.set(cacheKey, response);
  res.json(response);
});

// GET Single News
router.get('/:id', (req, res) => {
  const db = DataService.readData();
  const newsItem = db.news.find(n => n.id == req.params.id);
  if (!newsItem) return res.status(404).json({ message: "News not found" });
  res.json(newsItem);
});

// CREATE News
router.post('/', authenticateToken, (req, res) => {
  const { title, body } = req.body;
  const db = DataService.readData();

  const newPost = {
    id: Date.now(),
    title,
    body,
    author_id: req.user.id,
    author_name: req.user.username,
    comments: []
  };

  db.news.unshift(newPost);
  DataService.writeData(db);
  newsCache.flushAll();
  res.status(201).json(newPost);
});

// UPDATE News (Role Based: Only Author or Admin)
router.patch('/:id', authenticateToken, (req, res) => {
  const db = DataService.readData();
  const index = db.news.findIndex(n => n.id == req.params.id);

  if (index === -1) return res.status(404).json({ message: "News not found" });

  const newsItem = db.news[index];

  if (req.user.role !== 'admin' && newsItem.author_id !== req.user.id) {
    return res.status(403).json({ message: "Not authorized to edit this post" });
  }

  if (req.body.title) newsItem.title = req.body.title;
  if (req.body.body) newsItem.body = req.body.body;

  db.news[index] = newsItem;
  DataService.writeData(db);
  newsCache.flushAll();
  res.json(newsItem);
});

// DELETE News (Role Based: Only Author or Admin)
router.delete('/:id', authenticateToken, (req, res) => {
  const db = DataService.readData();
  const newsItem = db.news.find(n => n.id == req.params.id);

  if (!newsItem) return res.status(404).json({ message: "News not found" });

  if (req.user.role !== 'admin' && newsItem.author_id !== req.user.id) {
    return res.status(403).json({ message: "Not authorized to delete this post" });
  }

  db.news = db.news.filter(n => n.id != req.params.id);
  DataService.writeData(db);
  newsCache.flushAll();
  res.json({ message: "Deleted successfully" });
});

// Add Comment
router.post('/:id/comments', authenticateToken, (req, res) => {
  const db = DataService.readData();
  const index = db.news.findIndex(n => n.id == req.params.id);

  if (index === -1) return res.status(404).json({ message: "News not found" });

  const newComment = {
    id: Date.now(),
    text: req.body.text,
    user_id: req.user.id,
    username: req.user.username,
    timestamp: new Date().toISOString()
  };

  db.news[index].comments.push(newComment);
  DataService.writeData(db);
  newsCache.flushAll();
  res.status(201).json(newComment);
});

module.exports = router;
