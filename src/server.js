const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authController = require('./controllers/authController');
const newsController = require('./controllers/newsController');
const { PORT } = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.use('/auth', authController);
app.use('/news', newsController);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
