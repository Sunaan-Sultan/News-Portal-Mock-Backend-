const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const fs = require('fs');

const app = express();
const PORT = 3000;
const SECRET_KEY = "super_secret_key_123"; // In prod, use .env
const DB_FILE = './db.json';

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// 1. Rate Limiting (Extra)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// 2. Caching (Extra)
const newsCache = new NodeCache({ stdTTL: 60 }); // Cache for 60 seconds

// --- DATA LAYER (File Based) ---
const readData = () => {
    if (!fs.existsSync(DB_FILE)) {
        // Initialize if not exists
        const initialData = { users: [], news: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
};

const writeData = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- ROUTES: AUTHENTICATION ---

// Register
app.post('/auth/register', async (req, res) => {
    const { username, password, role } = req.body; // role: 'user' or 'admin'
    const db = readData();

    if (db.users.find(u => u.username === username)) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now(),
        username,
        password: hashedPassword,
        role: role || 'user'
    };

    db.users.push(newUser);
    writeData(db);
    res.status(201).json({ message: "User registered successfully" });
});

// Login
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const db = readData();
    const user = db.users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Profile
app.get('/auth/profile', authenticateToken, (req, res) => {
    res.json(req.user);
});

// --- ROUTES: NEWS (CRUD + Search/Pagination) ---

// GET News (with Search, Pagination & Caching)
app.get('/news', (req, res) => {
    const { page = 1, limit = 5, search = "" } = req.query;
    const cacheKey = `news_${page}_${limit}_${search}`;
    
    // Check Cache
    if (newsCache.has(cacheKey)) {
        return res.json(newsCache.get(cacheKey));
    }

    const db = readData();
    let results = db.news;

    // Search
    if (search) {
        results = results.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    const response = {
        data: paginatedResults,
        total: results.length,
        page: parseInt(page),
        totalPages: Math.ceil(results.length / limit)
    };

    // Set Cache
    newsCache.set(cacheKey, response);
    res.json(response);
});

// GET Single News
app.get('/news/:id', (req, res) => {
    const db = readData();
    const newsItem = db.news.find(n => n.id == req.params.id);
    if (!newsItem) return res.status(404).json({ message: "News not found" });
    res.json(newsItem);
});

// CREATE News
app.post('/news', authenticateToken, (req, res) => {
    const { title, body } = req.body;
    const db = readData();

    const newPost = {
        id: Date.now(),
        title,
        body,
        author_id: req.user.id,
        author_name: req.user.username,
        comments: []
    };

    db.news.unshift(newPost); // Add to top
    writeData(db);
    newsCache.flushAll(); // Clear cache on update
    res.status(201).json(newPost);
});

// UPDATE News (Role Based: Only Author or Admin)
app.patch('/news/:id', authenticateToken, (req, res) => {
    const db = readData();
    const index = db.news.findIndex(n => n.id == req.params.id);
    
    if (index === -1) return res.status(404).json({ message: "News not found" });

    const newsItem = db.news[index];

    // Role Check
    if (req.user.role !== 'admin' && newsItem.author_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to edit this post" });
    }

    // Update fields (title/body)
    if (req.body.title) newsItem.title = req.body.title;
    if (req.body.body) newsItem.body = req.body.body;

    db.news[index] = newsItem;
    writeData(db);
    newsCache.flushAll();
    res.json(newsItem);
});

// DELETE News (Role Based: Only Author or Admin)
app.delete('/news/:id', authenticateToken, (req, res) => {
    const db = readData();
    const newsItem = db.news.find(n => n.id == req.params.id);

    if (!newsItem) return res.status(404).json({ message: "News not found" });

    if (req.user.role !== 'admin' && newsItem.author_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    db.news = db.news.filter(n => n.id != req.params.id);
    writeData(db);
    newsCache.flushAll();
    res.json({ message: "Deleted successfully" });
});

// --- ROUTES: COMMENTS ---

// Add Comment
app.post('/news/:id/comments', authenticateToken, (req, res) => {
    const db = readData();
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
    writeData(db);
    newsCache.flushAll(); // Invalidate cache so new comment shows up
    res.status(201).json(newComment);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});