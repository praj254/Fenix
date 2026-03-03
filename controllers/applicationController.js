const { validationResult } = require('express-validator');
const Application = require('../models/application');

// GET /api/applications
async function getAll(req, res) {
  try {
    const { status, company, startDate, endDate, limit, offset } = req.query;
    const apps = await Application.findAllByUser(req.user.id, { status, company, startDate, endDate, limit, offset });
    return res.status(200).json({ applications: apps });
  } catch (err) {
    console.error('getAll error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch applications.' });
  }
}

// GET /api/applications/:id
async function getOne(req, res) {
  try {
    const app = await Application.findById(req.params.id, req.user.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    return res.status(200).json({ application: app });
  } catch (err) {
    console.error('getOne error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch application.' });
  }
}

// POST /api/applications
async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const id = await Application.create({ user_id: req.user.id, ...req.body });
    return res.status(201).json({ message: 'Application created.', id });
  } catch (err) {
    console.error('create error:', err.message);
    return res.status(500).json({ error: 'Failed to create application.' });
  }
}

// PUT /api/applications/:id
async function update(req, res) {
  try {
    const updated = await Application.update(req.params.id, req.user.id, req.body);
    if (!updated) return res.status(400).json({ error: 'Nothing to update or not found.' });
    return res.status(200).json({ message: 'Application updated.' });
  } catch (err) {
    console.error('update error:', err.message);
    return res.status(500).json({ error: 'Failed to update application.' });
  }
}

// DELETE /api/applications/:id
async function remove(req, res) {
  try {
    const deleted = await Application.delete(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Application not found.' });
    return res.status(200).json({ message: 'Application deleted.' });
  } catch (err) {
    console.error('delete error:', err.message);
    return res.status(500).json({ error: 'Failed to delete application.' });
  }
}

// GET /api/applications/stats
async function getStats(req, res) {
  try {
    const stats = await Application.countByStatus(req.user.id);
    return res.status(200).json({ stats });
  } catch (err) {
    console.error('getStats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
}

module.exports = { getAll, getOne, create, update, remove, getStats };
