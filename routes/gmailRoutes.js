const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const emailSyncJob = require('../jobs/emailSyncJob');

// All routes are protected — user must be logged in
router.use(authMiddleware);

/**
 * POST /api/gmail/sync
 * Manually trigger a Gmail sync (fetches UNSEEN emails only).
 */
router.post('/sync', async (req, res) => {
    try {
        const result = await emailSyncJob.run();
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        return res.status(200).json({
            message: `Gmail sync complete.`,
            ...result
        });
    } catch (err) {
        console.error('[GMAIL-SYNC] Manual sync error:', err.message);
        return res.status(500).json({ error: 'Gmail sync failed: ' + err.message });
    }
});

/**
 * POST /api/gmail/scan
 * Full scan — fetch ALL emails from the last N days (default: 30).
 * Use this for the first time to import historical job emails.
 * Query param: ?days=30
 */
router.post('/scan', async (req, res) => {
    try {
        const days = parseInt(req.query.days || req.body.days || '30', 10);
        const result = await emailSyncJob.runFullScan(days);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        return res.status(200).json({
            message: `Full scan complete. Scanned ${result.total} emails from the last ${days} days.`,
            ...result
        });
    } catch (err) {
        console.error('[GMAIL-SYNC] Full scan error:', err.message);
        return res.status(500).json({ error: 'Gmail scan failed: ' + err.message });
    }
});

module.exports = router;
