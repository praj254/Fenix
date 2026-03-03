const { pool } = require('../config/db');

const Resume = {

  async create({ user_id, file_path, version_name }) {
    const [result] = await pool.execute(
      `INSERT INTO resumes (user_id, file_path, version_name) VALUES (?, ?, ?)`,
      [user_id, file_path, version_name || null]
    );
    return result.insertId;
  },

  async findAllByUser(user_id) {
    const [rows] = await pool.execute(
      `SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC`,
      [user_id]
    );
    return rows;
  },

  async findById(id, user_id) {
    const [rows] = await pool.execute(
      `SELECT * FROM resumes WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, user_id]
    );
    return rows[0] || null;
  },

  async delete(id, user_id) {
    const [result] = await pool.execute(
      `DELETE FROM resumes WHERE id = ? AND user_id = ?`,
      [id, user_id]
    );
    return result.affectedRows > 0;
  }

};

module.exports = Resume;