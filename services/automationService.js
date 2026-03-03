const { pool } = require('../config/db');

const AutomationService = {

  // Find applications with no update for 14 days (status = Applied)
  async getFollowUpCandidates() {
    const [rows] = await pool.execute(
      `SELECT a.id, a.user_id, a.company_name, a.job_title, u.email, u.name
       FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.status = 'Applied'
         AND a.followup_sent = FALSE
         AND DATEDIFF(NOW(), a.last_updated) >= 14`
    );
    return rows;
  },

  // Mark followup_sent = true
  async markFollowupSent(application_id) {
    await pool.execute(
      `UPDATE applications SET followup_sent = TRUE WHERE id = ?`,
      [application_id]
    );
  },

  // Find applications with no update for 30 days (not already Ghosted/Offer/Rejected)
  async getGhostedCandidates() {
    const [rows] = await pool.execute(
      `SELECT a.id, a.user_id, a.company_name, a.job_title, u.email, u.name
       FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.status NOT IN ('Ghosted', 'Offer', 'Rejected')
         AND DATEDIFF(NOW(), a.last_updated) >= 30`
    );
    return rows;
  },

  // Update status to Ghosted
  async markAsGhosted(application_id) {
    await pool.execute(
      `UPDATE applications SET status = 'Ghosted' WHERE id = ?`,
      [application_id]
    );
  },

  // Insert a notification record
  async insertNotification(user_id, application_id, message, type) {
    await pool.execute(
      `INSERT INTO notifications (user_id, application_id, message, type)
       VALUES (?, ?, ?, ?)`,
      [user_id, application_id, message, type]
    );
  }

};

module.exports = AutomationService;