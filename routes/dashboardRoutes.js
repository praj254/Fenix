const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboardController');

// Protected route
router.get('/', authMiddleware, getDashboard);

module.exports = router;