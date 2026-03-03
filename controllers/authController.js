const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const EmailService = require('../services/emailService');

/* ─── POST /api/auth/register ───────────────────────────────── */
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  try {
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = await User.create({ name, email, password_hash });

    try { await EmailService.sendWelcome({ to: email, name }); } catch (e) { }

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

/* ─── POST /api/auth/login ──────────────────────────────────── */
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    // If 2FA is disabled, return token immediately
    if (!user.twofa_enabled) {
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
    }

    // 2FA enabled — generate and send OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await User.save2FACode(user.id, code, expiresAt);

    return res.status(200).json({
      message: '2FA code generated.',
      twofa_required: true,
      user_id: user.id,
      dev_code: code   // remove in production
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Server error during login.' });
  }
}

/* ─── POST /api/auth/verify-2fa ─────────────────────────────── */
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

/* ─── GET /api/auth/me ──────────────────────────────────────── */
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

/* ─── PUT /api/auth/me ──────────────────────────────────────── */
async function updateMe(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    name,
    bio = null,
    skills = null,
    experience = null,
    projects = null,
    phone = null,
  } = req.body;

  try {
    await User.updateProfile(req.user.id, { name, bio, skills, experience, projects, phone });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json({ message: 'Profile updated successfully.', user });
  } catch (err) {
    console.error('UpdateMe error:', err.message);
    return res.status(500).json({ error: 'Server error during profile update.' });
  }
}

/* ─── POST /api/auth/change-password ───────────────────────── */
async function changePw(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Both current and new password are required.' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });

  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(new_password, 10);
    await User.changePassword(user.id, newHash);

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('ChangePw error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

/* ─── PUT /api/auth/security ────────────────────────────────── */
async function updateSecurity(req, res) {
  const { phone = null, twofa_enabled } = req.body;

  try {
    await User.updateSecurity(req.user.id, {
      phone,
      twofa_enabled: twofa_enabled === undefined ? 1 : (twofa_enabled ? 1 : 0),
    });
    const user = await User.findById(req.user.id);
    return res.status(200).json({ message: 'Security settings updated.', user });
  } catch (err) {
    console.error('UpdateSecurity error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { register, login, verify2FA, getMe, updateMe, changePw, updateSecurity };