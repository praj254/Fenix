const { pool } = require('../config/db');

const User = {

  async create({ name, email, password_hash }) {
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
      [name, email, password_hash]
    );
    return result.insertId;
  },

  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    try {
      const [rows] = await pool.execute(
        `SELECT id, name, email, role, created_at, bio, skills, experience, projects FROM users WHERE id = ? LIMIT 1`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      // Fallback for older DBs without profile columns
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        const [rows] = await pool.execute(
          `SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1`,
          [id]
        );
        return rows[0] || null;
      }
      throw err;
    }
  },

  async updateProfile(id, { name, bio = null, skills = null, experience = null, projects = null }) {
    try {
      await pool.execute(
        `UPDATE users SET name = ?, bio = ?, skills = ?, experience = ?, projects = ? WHERE id = ?`,
        [name, bio, skills, experience, projects, id]
      );
    } catch (err) {
      // Fallback: if extended columns don't exist yet, just update name
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        await pool.execute(
          `UPDATE users SET name = ? WHERE id = ?`,
          [name, id]
        );
        return;
      }
      throw err;
    }
  },

  async save2FACode(userId, code, expiresAt) {
    await pool.execute(
      `UPDATE users SET twofa_code = ?, twofa_expires = ? WHERE id = ?`,
      [code, expiresAt, userId]
    );
  },

  async verify2FACode(userId, code) {
    const [rows] = await pool.execute(
      `SELECT * FROM users 
       WHERE id = ? AND twofa_code = ? AND twofa_expires > NOW() 
       LIMIT 1`,
      [userId, code]
    );
    return rows[0] || null;
  },

  async clear2FACode(userId) {
    await pool.execute(
      `UPDATE users SET twofa_code = NULL, twofa_expires = NULL WHERE id = ?`,
      [userId]
    );
  }

};

module.exports = User;