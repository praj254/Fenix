const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register, login, verify2FA,
  getMe, updateMe,
  changePw, updateSecurity,
  sendPhoneVerification, verifyPhone,
  forgotPasswordOtp, forgotPasswordVerify, forgotPasswordReset
} = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.')
];

const profileRules = [
  body('name').trim().notEmpty().withMessage('Name is required.')
];

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.post('/verify-2fa', verify2FA);
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, profileRules, updateMe);
router.post('/change-password', authMiddleware, changePw);
router.put('/security', authMiddleware, updateSecurity);

router.post('/send-phone-verification', authMiddleware, sendPhoneVerification);
router.post('/verify-phone', authMiddleware, verifyPhone);
router.post('/forgot-password-otp', forgotPasswordOtp);
router.post('/forgot-password-verify', forgotPasswordVerify);
router.post('/forgot-password-reset', forgotPasswordReset);

module.exports = router;