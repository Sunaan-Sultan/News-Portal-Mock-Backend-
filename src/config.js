const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  SECRET_KEY: process.env.SECRET_KEY || 'super_secret_key_123',
  DB_FILE: path.resolve(process.cwd(), 'db.json')
};
