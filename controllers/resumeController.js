const path = require('path');
const fs = require('fs');
const Resume = require('../models/Resume');

// GET /api/resumes
async function getAll(req, res) {
  try {
    const resumes = await Resume.findAllByUser(req.user.id);
    return res.status(200).json({ resumes });
  } catch (err) {
    console.error('getAll resumes error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch resumes.' });
  }
}

// POST /api/resumes
async function upload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { version_name } = req.body;
    const file_path = req.file.path;

    const id = await Resume.create({
      user_id: req.user.id,
      file_path,
      version_name: version_name || req.file.originalname
    });

    return res.status(201).json({
      message: 'Resume uploaded successfully.',
      resume: { id, file_path, version_name }
    });
  } catch (err) {
    console.error('upload resume error:', err.message);
    return res.status(500).json({ error: 'Failed to upload resume.' });
  }
}

// DELETE /api/resumes/:id
async function remove(req, res) {
  try {
    const resume = await Resume.findById(req.params.id, req.user.id);
    if (!resume) return res.status(404).json({ error: 'Resume not found.' });

    // Delete file from disk
    if (fs.existsSync(resume.file_path)) {
      fs.unlinkSync(resume.file_path);
    }

    await Resume.delete(req.params.id, req.user.id);
    return res.status(200).json({ message: 'Resume deleted.' });
  } catch (err) {
    console.error('delete resume error:', err.message);
    return res.status(500).json({ error: 'Failed to delete resume.' });
  }
}

module.exports = { getAll, upload, remove };
