const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { getAll, getOne, create, update, remove, getStats } = require('../controllers/applicationController');

// All routes are protected
router.use(authMiddleware);

const createRules = [
  body('company_name').trim().notEmpty().withMessage('Company name is required.'),
  body('job_title').trim().notEmpty().withMessage('Job title is required.'),
  body('status').optional().isIn(['Applied', 'Interview', 'Rejected', 'Offer', 'Ghosted']).withMessage('Invalid status.')
];

router.get('/stats', getStats);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', createRules, create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;