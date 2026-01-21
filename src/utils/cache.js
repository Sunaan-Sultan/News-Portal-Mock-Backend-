const NodeCache = require('node-cache');

const newsCache = new NodeCache({ stdTTL: 60 });

module.exports = newsCache;
