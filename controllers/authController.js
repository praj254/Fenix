const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const { validationResult } = require('express-validator');
const User      = require('../models/User');
const EmailService = require('../services/emailService');

// POST /api/auth/register
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  try {
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const salt          = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId        = await User.create({ name, email, password_hash });

    try { await EmailService.sendWelcome({ to: email, name }); } catch(e) {}

    const token = jwt.sign(
      { id: userId, email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: { id: userId, name, email }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
}

// POST /api/auth/login  (step 1 — returns temp token + triggers 2FA)
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    // Generate 6-digit 2FA code
    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await User.save2FACode(user.id, code, expiresAt);

    // Try to send email, but also return code for dev/testing
    try { await EmailService.sendWelcome({ to: email, name: user.name }); } catch(e) {}

    return res.status(200).json({
      message: '2FA code generated.',
      twofa_required: true,
      user_id: user.id,
      // Return code directly for now (remove in production)
      dev_code: code
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Server error during login.' });
  }
}

// POST /api/auth/verify-2fa
async function verify2FA(req, res) {
  const { user_id, code } = req.body;
  if (!user_id || !code) return res.status(400).json({ error: 'user_id and code required.' });

  try {
    const user = await User.verify2FACode(user_id, code);
    if (!user) return res.status(401).json({ error: 'Invalid or expired code.' });

    await User.clear2FACode(user_id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('2FA verify error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json({ user });
  } catch (err) {
    console.error('GetMe error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

// PUT /api/auth/me
async function updateMe(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    name,
    bio        = null,
    skills     = null,
    experience = null,
    projects   = null
  } = req.body;

  try {
    await User.updateProfile(req.user.id, { name, bio, skills, experience, projects });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user
    });
  } catch (err) {
    console.error('UpdateMe error:', err.message);
    return res.status(500).json({ error: 'Server error during profile update.' });
  }
}

module.exports = { register, login, verify2FA, getMe, updateMe };