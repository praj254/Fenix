const { pool } = require('../config/db');

/* ─── Auto-migrate: add new columns if they don't exist yet ─── */
async function autoMigrate() {
  const migrations = [
    `ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL`,
    `ALTER TABLE users ADD COLUMN is_email_verified TINYINT(1) DEFAULT 1`,
    `ALTER TABLE users ADD COLUMN is_phone_verified TINYINT(1) DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN twofa_type ENUM('email', 'phone') DEFAULT 'email'`,
    `ALTER TABLE users ADD COLUMN twofa_enabled TINYINT(1) NOT NULL DEFAULT 0`
  ];
  for (const sql of migrations) {
    try { await pool.execute(sql); } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('Migration error:', e.message);
      }
    }
  }
}
autoMigrate().catch(() => { });

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
        `SELECT id, name, email, role, created_at,
                bio, skills, experience, projects,
                phone, twofa_enabled, is_email_verified, is_phone_verified, twofa_type
         FROM users WHERE id = ? LIMIT 1`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      // Graceful fallback for columns not yet migrated
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

  async updateProfile(id, { name, bio = null, skills = null, experience = null, projects = null, phone = null }) {
    try {
      await pool.execute(
        `UPDATE users SET name = ?, bio = ?, skills = ?, experience = ?, projects = ?, phone = ? WHERE id = ?`,
        [name, bio, skills, experience, projects, phone || null, id]
      );
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        await pool.execute(`UPDATE users SET name = ? WHERE id = ?`, [name, id]);
        return;
      }
      throw err;
    }
  },

  async updateSecurity(id, { phone = null, twofa_enabled = 0, twofa_type = 'email' }) {
    await pool.execute(
      `UPDATE users SET phone = ?, twofa_enabled = ?, twofa_type = ? WHERE id = ?`,
      [phone || null, twofa_enabled ? 1 : 0, twofa_type, id]
    );
  },

  async changePassword(id, newHash) {
    await pool.execute(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [newHash, id]
    );
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
  },

  async markPhoneVerified(userId) {
    await pool.execute(
      `UPDATE users SET is_phone_verified = 1 WHERE id = ?`,
      [userId]
    );
  }
};

module.exports = User;