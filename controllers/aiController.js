const AIService = require('../services/aiService');
const { pool } = require('../config/db');

// POST /api/ai/match-score
async function matchScore(req, res) {
  const { resume_text, job_description, application_id } = req.body;

  if (!resume_text || !job_description) {
    return res.status(400).json({ error: 'resume_text and job_description are required.' });
  }

  try {
    const result = await AIService.matchScore(resume_text, job_description);

    // Log to ai_analytics_log
    await pool.execute(
      `INSERT INTO ai_analytics_log (user_id, application_id, ai_score, analysis_summary)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, application_id || null, result.score, JSON.stringify(result)]
    );

    return res.status(200).json({ result });
  } catch (err) {
    console.error('matchScore error:', err.message);
    return res.status(500).json({ error: 'AI analysis failed.' });
  }
}

// POST /api/ai/analyze-rejection
async function analyzeRejection(req, res) {
  const { email_content, application_id } = req.body;

  if (!email_content) {
    return res.status(400).json({ error: 'email_content is required.' });
  }

  try {
    const result = await AIService.analyzeRejection(email_content);

    // If it's a rejection, update application status
    if (result.is_rejection && application_id) {
      await pool.execute(
        `UPDATE applications SET status = 'Rejected' WHERE id = ? AND user_id = ?`,
        [application_id, req.user.id]
      );

      // Insert notification
      await pool.execute(
        `INSERT INTO notifications (user_id, application_id, message, type)
         VALUES (?, ?, ?, ?)`,
        [req.user.id, application_id, `Rejection email analyzed for application #${application_id}. Check your AI insights.`, 'status_change']
      );
    }

    // Log to ai_analytics_log
    await pool.execute(
      `INSERT INTO ai_analytics_log (user_id, application_id, ai_score, analysis_summary)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, application_id || null, null, JSON.stringify(result)]
    );

    return res.status(200).json({ result });
  } catch (err) {
    console.error('analyzeRejection error:', err.message);
    return res.status(500).json({ error: 'AI analysis failed.' });
  }
}

// POST /api/ai/ats-check
async function atsCheck(req, res) {
  const { resume_text, job_description } = req.body;

  if (!resume_text || !job_description) {
    return res.status(400).json({ error: 'resume_text and job_description are required.' });
  }

  try {
    const result = await AIService.atsCheck(resume_text, job_description);
    return res.status(200).json({ result });
  } catch (err) {
    console.error('atsCheck error:', err.message);
    return res.status(500).json({ error: 'AI analysis failed.' });
  }
}

module.exports = { matchScore, analyzeRejection, atsCheck };
