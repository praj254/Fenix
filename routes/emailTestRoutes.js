const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/auth');
const EmailService   = require('../services/emailService');

// GET /api/test-email
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { email, name } = req.user;
    await EmailService.sendWelcome({ to: email, name: name || 'there' });
    return res.status(200).json({ message: 'Test email sent (check your inbox).' });
  } catch (err) {
    console.error('Test email error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to send test email.' });
  }
});

module.exports = router;

