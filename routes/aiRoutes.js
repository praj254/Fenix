const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { matchScore, analyzeRejection, atsCheck } = require('../controllers/aiController');

// All routes protected
router.use(authMiddleware);

router.post('/match-score', matchScore);
router.post('/analyze-rejection', analyzeRejection);
router.post('/ats-check', atsCheck);

module.exports = router;