const bcrypt = require('bcryptjs');

class User {
  constructor(db) {
    this.db = db;
  }

  async create({ full_name, email, password, role = 'patient' }) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await this.db.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role, created_at',
      [full_name, email, password_hash, role]
    );
    return result.rows[0];
  }

  async findByEmail(email) {
    const result = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await this.db.query(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async validatePassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }
}

module.exports = User;
