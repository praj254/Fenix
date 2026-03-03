const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const SmsService = require('../services/smsService');

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

    const isKnownDevice = req.cookies && req.cookies.known_device === user.id.toString();

    // If 2FA is disabled OR device is trusted -> return token immediately
    if (!user.twofa_enabled || isKnownDevice) {
      if (!isKnownDevice) {
        try {
          await EmailService.sendLoginAlert({
            to: user.email,
            name: user.name,
            device: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress,
            time: new Date().toLocaleString()
          });
        } catch (e) { console.error('Failed to send login alert', e) }
      }

      res.cookie('known_device', user.id.toString(), { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });

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

    if (user.twofa_type === 'email' || !user.twofa_type) {
      try {
        await EmailService.send2FAEmail({ to: user.email, name: user.name, code });
      } catch (e) { console.error('Failed to send 2FA email', e) }
    } else if (user.twofa_type === 'phone') {
      try {
        await SmsService.sendOTP(user.phone, code);
      } catch (e) { console.error('Failed to send 2FA SMS', e) }
    }

    return res.status(200).json({
      message: '2FA code generated.',
      twofa_required: true,
      user_id: user.id,
      twofa_type: user.twofa_type || 'email'
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

    const isKnownDevice = req.cookies && req.cookies.known_device === user.id.toString();
    if (!isKnownDevice) {
      try {
        await EmailService.sendLoginAlert({
          to: user.email,
          name: user.name,
          device: req.headers['user-agent'],
          ip: req.ip || req.connection.remoteAddress,
          time: new Date().toLocaleString()
        });
      } catch (e) { console.error('Failed to send login alert', e) }
    }

    res.cookie('known_device', user.id.toString(), { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });

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
  const { phone, twofa_enabled, twofa_type } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let enable2FA = twofa_enabled === undefined ? user.twofa_enabled : (twofa_enabled ? 1 : 0);
    let type = twofa_type || user.twofa_type || 'email';
    let updatedPhone = phone !== undefined ? phone : user.phone;

    if (enable2FA) {
      if (type === 'email' && !user.is_email_verified) {
        return res.status(400).json({ error: 'Email must be verified to enable Email 2FA.' });
      }
      if (type === 'phone' && !user.is_phone_verified) {
        return res.status(400).json({ error: 'Phone must be verified to enable Phone 2FA.' });
      }
    }

    await User.updateSecurity(req.user.id, {
      phone: updatedPhone,
      twofa_enabled: enable2FA,
      twofa_type: type
    });

    const updatedUser = await User.findById(req.user.id);
    return res.status(200).json({ message: 'Security settings updated.', user: updatedUser });
  } catch (err) {
    console.error('UpdateSecurity error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

/* ─── POST /api/auth/send-phone-verification ────────────────── */
async function sendPhoneVerification(req, res) {
  const { phone } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const targetPhone = phone || user.phone;
    if (!targetPhone) return res.status(400).json({ error: 'No phone number provided.' });

    // Save the unverified phone to the DB so it can be verified later.
    // If the user already verified a DIFFERENT phone, they shouldn't trigger this unless they want to change it.
    await User.updateSecurity(user.id, { phone: targetPhone, twofa_enabled: user.twofa_enabled, twofa_type: user.twofa_type });
    // Reset the verify flag since it's a new or unverified number
    const { pool } = require('../config/db');
    await pool.execute('UPDATE users SET is_phone_verified = 0 WHERE id = ?', [user.id]);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await User.save2FACode(user.id, code, expiresAt);

    try {
      await SmsService.sendOTP(targetPhone, code);
    } catch (e) { console.error('Failed to send verify SMS', e) }

    return res.status(200).json({
      message: 'Verification code sent to phone.'
    });
  } catch (err) {
    console.error('SendPhoneVerif error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

/* ─── POST /api/auth/verify-phone ───────────────────────────── */
async function verifyPhone(req, res) {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required.' });

  try {
    const user = await User.verify2FACode(req.user.id, code);
    if (!user) return res.status(401).json({ error: 'Invalid or expired code.' });

    await User.markPhoneVerified(user.id);
    await User.clear2FACode(user.id);

    const updatedUser = await User.findById(user.id);

    return res.status(200).json({
      message: 'Phone verified successfully.',
      user: updatedUser
    });
  } catch (err) {
    console.error('VerifyPhone error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

/* ─── POST /api/auth/forgot-password-otp ────────────────────── */
async function forgotPasswordOtp(req, res) {
  const { identifier } = req.body; // email or phone
  if (!identifier) return res.status(400).json({ error: 'Email or Phone is required.' });

  try {
    let user;
    // Check if looks like email
    if (identifier.includes('@')) {
      user = await User.findByEmail(identifier);
    } else {
      // Find by phone (we need a custom query since User model doesn't have it explicitly yet)
      const { pool } = require('../config/db');
      const [rows] = await pool.execute(`SELECT * FROM users WHERE phone = ? LIMIT 1`, [identifier]);
      user = rows[0] || null;
    }

    if (!user) return res.status(404).json({ error: 'No account found with that identifier.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await User.save2FACode(user.id, code, expiresAt);

    if (identifier.includes('@')) {
      try {
        await EmailService.send2FAEmail({ to: user.email, name: user.name, code });
      } catch (e) {
        console.error('Failed to send forgot password email', e);
      }
    } else {
      try {
        await SmsService.sendOTP(user.phone, code);
      } catch (e) {
        console.error('Failed to send forgot password SMS', e);
      }
    }

    return res.status(200).json({
      message: 'Password reset code sent.',
      identifier: identifier
    });
  } catch (err) {
    console.error('ForgotPasswordOtp error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

/* ─── POST /api/auth/forgot-password-reset ──────────────────── */
async function forgotPasswordReset(req, res) {
  const { identifier, code, new_password } = req.body;
  if (!identifier || !code || !new_password) {
    return res.status(400).json({ error: 'identifier, code, and new_password are required.' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    let user;
    if (identifier.includes('@')) {
      user = await User.findByEmail(identifier);
    } else {
      const { pool } = require('../config/db');
      const [rows] = await pool.execute(`SELECT * FROM users WHERE phone = ? LIMIT 1`, [identifier]);
      user = rows[0] || null;
    }

    if (!user) return res.status(404).json({ error: 'No account found.' });

    // Find the code using existing verify logic
    const userMatch = await User.verify2FACode(user.id, code);
    if (!userMatch) return res.status(401).json({ error: 'Invalid or expired code.' });

    // Update password
    const newHash = await bcrypt.hash(new_password, 10);
    await User.changePassword(user.id, newHash);
    await User.clear2FACode(user.id);

    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('ForgotPasswordReset error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

/* ─── POST /api/auth/forgot-password-verify ─────────────────── */
async function forgotPasswordVerify(req, res) {
  const { identifier, code } = req.body;
  if (!identifier || !code) return res.status(400).json({ error: 'Identifier and code are required.' });

  try {
    let user;
    if (identifier.includes('@')) {
      user = await User.findByEmail(identifier);
    } else {
      const { pool } = require('../config/db');
      const [rows] = await pool.execute(`SELECT * FROM users WHERE phone = ? LIMIT 1`, [identifier]);
      user = rows[0] || null;
    }

    if (!user) return res.status(404).json({ error: 'No account found.' });

    const userMatch = await User.verify2FACode(user.id, code);
    if (!userMatch) return res.status(401).json({ error: 'Invalid or expired code.' });

    // Do NOT clear code yet, they need it for the final reset step
    return res.status(200).json({ message: 'Code verified successfully.', verified: true });
  } catch (err) {
    console.error('ForgotPasswordVerify error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = {
  register, login, verify2FA, getMe, updateMe, changePw, updateSecurity,
  sendPhoneVerification, verifyPhone, forgotPasswordOtp, forgotPasswordVerify, forgotPasswordReset
};