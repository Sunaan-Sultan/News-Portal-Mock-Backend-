const fs = require('fs');
const path = require('path');
const { DB_FILE } = require('../config');

class DataService {
  constructor(dbFile = DB_FILE) {
    this.dbFile = dbFile;
    if (!fs.existsSync(this.dbFile)) {
      const initialData = { users: [], news: [] };
      fs.writeFileSync(this.dbFile, JSON.stringify(initialData, null, 2));
    }
  }

  readData() {
    return JSON.parse(fs.readFileSync(this.dbFile));
  }

  writeData(data) {
    fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2));
  }
}

module.exports = new DataService();
