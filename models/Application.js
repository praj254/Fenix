const { pool } = require('../config/db');

const Application = {

  async create({ user_id, company_name, job_title, job_description, job_link, location, salary_range, status, applied_date, resume_id, notes }) {
    const [result] = await pool.execute(
      `INSERT INTO applications 
        (user_id, company_name, job_title, job_description, job_link, location, salary_range, status, applied_date, resume_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, company_name, job_title, job_description || null, job_link || null, location || null, salary_range || null, status || 'Applied', applied_date || null, resume_id || null, notes || null]
    );
    return result.insertId;
  },

  async findAllByUser(user_id, { status, company, startDate, endDate, limit = 10, offset = 0 } = {}) {
    let query = `SELECT * FROM applications WHERE user_id = ?`;
    const params = [user_id];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    if (company) {
      query += ` AND company_name LIKE ?`;
      params.push(`%${company}%`);
    }
    if (startDate) {
      query += ` AND applied_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND applied_date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY last_updated DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  async findById(id, user_id) {
    const [rows] = await pool.execute(
      `SELECT * FROM applications WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, user_id]
    );
    return rows[0] || null;
  },

  async update(id, user_id, fields) {
    const allowed = ['company_name', 'job_title', 'job_description', 'job_link', 'location', 'salary_range', 'status', 'applied_date', 'resume_id', 'notes'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(fields[key]);
      }
    }

    if (updates.length === 0) return false;

    params.push(id, user_id);
    await pool.execute(
      `UPDATE applications SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );
    return true;
  },

  async delete(id, user_id) {
    const [result] = await pool.execute(
      `DELETE FROM applications WHERE id = ? AND user_id = ?`,
      [id, user_id]
    );
    return result.affectedRows > 0;
  },

  async countByStatus(user_id) {
    const [rows] = await pool.execute(
      `SELECT status, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY status`,
      [user_id]
    );
    return rows;
  }

};

module.exports = Application;
