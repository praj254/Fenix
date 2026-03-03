const { pool } = require('../config/db');

/* ─── Auto-migrate: add new columns and tables for Status Intelligence ─── */
/* ─── Auto-migrate: add new columns and tables for Status Intelligence ─── */
async function autoMigrate() {
  try {
    // 1. Create new tables first (safest)
    const newTables = [
      `CREATE TABLE IF NOT EXISTS application_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        source VARCHAR(50) NOT NULL,
        raw_evidence TEXT,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (application_id)
      )`,
      `CREATE TABLE IF NOT EXISTS interviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        interview_stage VARCHAR(50),
        scheduled_at DATETIME NOT NULL,
        meeting_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (application_id)
      )`,
      `CREATE TABLE IF NOT EXISTS portal_sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        portal_type VARCHAR(50) NOT NULL,
        sync_status VARCHAR(20),
        records_updated INT DEFAULT 0,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id)
      )`
    ];
    for (const sql of newTables) {
      await pool.execute(sql);
    }

    // 2. Check and Add Columns to applications (avoiding Deadlocks)
    const [columns] = await pool.execute(`SHOW COLUMNS FROM applications`);
    const existingColumns = columns.map(c => c.Field);

    const neededColumns = {
      'portal_type': `ALTER TABLE applications ADD COLUMN portal_type VARCHAR(50) DEFAULT 'UNKNOWN'`,
      'portal_url': `ALTER TABLE applications ADD COLUMN portal_url TEXT NULL`,
      'last_activity_date': `ALTER TABLE applications ADD COLUMN last_activity_date DATETIME NULL`,
      'followup_sent': `ALTER TABLE applications ADD COLUMN followup_sent TINYINT(1) DEFAULT 0`,
      'last_updated': `ALTER TABLE applications ADD COLUMN last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    };

    for (const [col, sql] of Object.entries(neededColumns)) {
      if (!existingColumns.includes(col)) {
        try {
          await pool.execute(sql);
        } catch (e) {
          if (e.code !== 'ER_DUP_FIELDNAME') console.error(`Migration error on ${col}:`, e.message);
        }
      }
    }

    // 3. Initialize last_activity_date
    await pool.execute(`UPDATE applications SET last_activity_date = applied_date WHERE last_activity_date IS NULL`);

  } catch (err) {
    if (err.code !== 'ER_LOCK_DEADLOCK') {
      console.error('Migration error:', err.message);
    }
  }
}
autoMigrate().catch(() => { });

const Application = {

  async create({ user_id, company_name, job_title, job_description, job_link, location, salary_range, status, applied_date, resume_id, notes, portal_type, portal_url }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO applications 
          (user_id, company_name, job_title, job_description, job_link, location, salary_range, status, applied_date, resume_id, notes, portal_type, portal_url, last_activity_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id, company_name, job_title, job_description || null, job_link || null,
          location || null, salary_range || null, status || 'Applied', applied_date || null,
          resume_id || null, notes || null, portal_type || 'UNKNOWN', portal_url || null,
          new Date()
        ]
      );
      const appId = result.insertId;

      // Log initial status
      await conn.execute(
        `INSERT INTO application_status_history (application_id, status, source) VALUES (?, ?, ?)`,
        [appId, status || 'Applied', 'MANUAL']
      );

      await conn.commit();
      return appId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
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

    // Ensure numeric and safe values
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset) || 0;
    params.push(safeLimit, safeOffset);

    const [rows] = await pool.query(query, params);
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
    const allowed = ['company_name', 'job_title', 'job_description', 'job_link', 'location', 'salary_range', 'status', 'applied_date', 'resume_id', 'notes', 'portal_type', 'portal_url', 'last_activity_date'];
    const updates = [];
    const params = [];

    const weights = { 'Offer': 5, 'Interview': 4, 'Rejected': 3, 'Under Review': 2, 'Applied': 1, 'Ghosted': 0 };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check current status if changing
      if (fields.status) {
        const [current] = await conn.execute(`SELECT status FROM applications WHERE id = ? AND user_id = ?`, [id, user_id]);
        if (current[0]) {
          const oldStatus = current[0].status;
          const newStatus = fields.status;

          // Prevent downgrading status unless forced or specific logic
          if (weights[newStatus] < weights[oldStatus] && fields.force_status !== true) {
            delete fields.status; // Don't update status
          } else if (newStatus !== oldStatus) {
            // Log status change
            await conn.execute(
              `INSERT INTO application_status_history (application_id, status, source) VALUES (?, ?, ?)`,
              [id, newStatus, fields.source || 'MANUAL']
            );
          }
        }
      }

      for (const key of allowed) {
        if (fields[key] !== undefined) {
          updates.push(`${key} = ?`);
          params.push(fields[key]);
        }
      }

      if (updates.length > 0) {
        params.push(id, user_id);
        await conn.execute(
          `UPDATE applications SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
          params
        );
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
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
