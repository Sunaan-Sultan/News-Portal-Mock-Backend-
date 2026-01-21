const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const DataService = require('../data/DataService');

class AuthService {
  async register({ username, password, role }) {
    const db = DataService.readData();
    if (db.users.find(u => u.username === username)) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      username,
      password: hashedPassword,
      role: role || 'user'
    };

    db.users.push(newUser);
    DataService.writeData(db);
    return { message: 'User registered successfully' };
  }

  async login({ username, password }) {
    const db = DataService.readData();
    const user = db.users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, config.SECRET_KEY, { expiresIn: '1h' });
    return { token, user: { id: user.id, username: user.username, role: user.role } };
  }
}

module.exports = new AuthService();
