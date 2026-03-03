const Analytics = require('../models/analytics');

// GET /api/dashboard
async function getDashboard(req, res) {
  try {
    const user_id = req.user.id;

    const [
      total,
      byStatus,
      monthlyTrend,
      avgResponseTime,
      interviewRate,
      offerRate,
      recentApplications
    ] = await Promise.all([
      Analytics.getTotalCount(user_id),
      Analytics.getCountByStatus(user_id),
      Analytics.getMonthlyTrend(user_id),
      Analytics.getAvgResponseTime(user_id),
      Analytics.getInterviewRate(user_id),
      Analytics.getOfferRate(user_id),
      Analytics.getRecentApplications(user_id)
    ]);

    const statusMap = {
      Applied: 0,
      Interview: 0,
      Rejected: 0,
      Offer: 0,
      Ghosted: 0
    };
    byStatus.forEach(row => {
      statusMap[row.status] = row.count;
    });

    return res.status(200).json({
      summary: {
        total,
        interview_rate: `${interviewRate}%`,
        offer_rate: `${offerRate}%`,
        avg_response_time: `${avgResponseTime} days`
      },
      by_status: statusMap,
      monthly_trend: monthlyTrend,
      recent_applications: recentApplications
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    return res.status(500).json({ error: 'Failed to load dashboard.' });
  }
}

module.exports = { getDashboard };