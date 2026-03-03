const { pool } = require('../config/db');

const Analytics = {

  async getTotalCount(user_id) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as total FROM applications WHERE user_id = ?`,
      [user_id]
    );
    return rows[0].total;
  },

  async getCountByStatus(user_id) {
    const [rows] = await pool.execute(
      `SELECT status, COUNT(*) as count 
       FROM applications 
       WHERE user_id = ? 
       GROUP BY status`,
      [user_id]
    );
    return rows;
  },

  async getMonthlyTrend(user_id) {
    const [rows] = await pool.execute(
      `SELECT 
         DATE_FORMAT(applied_date, '%Y-%m') as month,
         COUNT(*) as count
       FROM applications
       WHERE user_id = ?
         AND applied_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month
       ORDER BY month ASC`,
      [user_id]
    );
    return rows;
  },

  async getAvgResponseTime(user_id) {
    const [rows] = await pool.execute(
      `SELECT ROUND(AVG(DATEDIFF(last_updated, applied_date)), 1) as avg_days
       FROM applications
       WHERE user_id = ?
         AND status IN ('Interview', 'Rejected', 'Offer')
         AND applied_date IS NOT NULL`,
      [user_id]
    );
    return rows[0].avg_days || 0;
  },

  async getInterviewRate(user_id) {
    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM applications WHERE user_id = ?`,
      [user_id]
    );
    const [interviews] = await pool.execute(
      `SELECT COUNT(*) as count FROM applications 
       WHERE user_id = ? AND status IN ('Interview', 'Offer')`,
      [user_id]
    );
    const totalCount = total[0].count;
    const interviewCount = interviews[0].count;
    if (totalCount === 0) return 0;
    return Math.round((interviewCount / totalCount) * 100);
  },

  async getOfferRate(user_id) {
    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM applications WHERE user_id = ?`,
      [user_id]
    );
    const [offers] = await pool.execute(
      `SELECT COUNT(*) as count FROM applications 
       WHERE user_id = ? AND status = 'Offer'`,
      [user_id]
    );
    const totalCount = total[0].count;
    const offerCount = offers[0].count;
    if (totalCount === 0) return 0;
    return Math.round((offerCount / totalCount) * 100);
  },

  async getRecentApplications(user_id) {
    const [rows] = await pool.execute(
      `SELECT id, company_name, job_title, status, applied_date, last_updated
       FROM applications
       WHERE user_id = ?
       ORDER BY last_updated DESC
       LIMIT 5`,
      [user_id]
    );
    return rows;
  },

  async getStatusAging(user_id) {
    const [rows] = await pool.execute(
      `SELECT id, company_name, job_title, status,
      DATEDIFF(NOW(), last_activity_date) as days_stale
       FROM applications
       WHERE user_id = ?
      AND status NOT IN('Offer', 'Rejected', 'Ghosted')
       ORDER BY days_stale DESC`,
      [user_id]
    );
    return rows;
  },

  async getPortalPerformance(user_id) {
    const [rows] = await pool.execute(
      `SELECT portal_type,
      COUNT(*) as total_apps,
      COUNT(CASE WHEN status IN('Interview', 'Offer') THEN 1 END) as positive_responses,
      ROUND(COUNT(CASE WHEN status IN('Interview', 'Offer') THEN 1 END) / COUNT(*) * 100, 1) as success_rate
       FROM applications
       WHERE user_id = ? AND portal_type != 'UNKNOWN'
       GROUP BY portal_type
       ORDER BY success_rate DESC`,
      [user_id]
    );
    return rows;
  }

};

module.exports = Analytics;