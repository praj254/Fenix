const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const { getAll, upload, remove } = require('../controllers/resumeController');

// Multer config — store in /uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const unique = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

// Only allow PDF and Word docs
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed.'), false);
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Routes
router.use(authMiddleware);

router.get('/', getAll);
router.post('/', uploadMiddleware.single('resume'), upload);
router.delete('/:id', remove);

module.exports = router;