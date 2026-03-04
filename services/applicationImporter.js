/**
 * Application Importer
 * Checks for duplicates and inserts new job applications using the existing Application model.
 */

const { pool } = require('../config/db');
const Application = require('../models/Application');

const ApplicationImporter = {

    /**
     * Check if a similar application already exists for this user.
     * Matches on company_name (case-insensitive) + job_title (case-insensitive).
     * @param {number} userId
     * @param {string} companyName
     * @param {string} jobTitle
     * @returns {Object|null} Existing application row or null
     */
    async findDuplicate(userId, companyName, jobTitle) {
        const [rows] = await pool.execute(
            `SELECT id, status, email_subject, job_id FROM applications 
       WHERE user_id = ? 
         AND LOWER(company_name) = LOWER(?) 
         AND LOWER(job_title) = LOWER(?)
       LIMIT 1`,
            [userId, companyName, jobTitle]
        );
        return rows[0] || null;
    },

    /**
     * Check if an application with the exact same email_subject exists for this user.
     * This catches cases where company/role couldn't be parsed but the same email was processed.
     * @param {number} userId
     * @param {string} emailSubject
     * @returns {Object|null}
     */
    async findByEmailSubject(userId, emailSubject) {
        if (!emailSubject) return null;
        const [rows] = await pool.execute(
            `SELECT id, status, job_id FROM applications 
       WHERE user_id = ? 
         AND email_subject = ?
       LIMIT 1`,
            [userId, emailSubject]
        );
        return rows[0] || null;
    },

    /**
     * Import a parsed application entry. Handles duplicate checking and status upgrades.
     * @param {number} userId - The user who owns the application
     * @param {Object} parsedData - Output from emailParser.parse()
     * @returns {{ action: 'inserted'|'updated'|'skipped', id?: number, reason?: string }}
     */
    async importApplication(userId, parsedData) {
        const { company_name, job_title, job_id, status, applied_date, email_subject, sender_email } = parsedData;

        // 1. Check for exact duplicate by company + role
        const existingByRole = await this.findDuplicate(userId, company_name, job_title);
        if (existingByRole) {
            // If the new status is "higher priority", update it
            const statusWeights = { 'Applied': 1, 'Under Review': 2, 'Assessment': 3, 'Rejected': 3, 'Interview': 4, 'Offer': 5 };
            const oldWeight = statusWeights[existingByRole.status] || 0;
            const newWeight = statusWeights[status] || 0;

            const updateFields = {
                status: existingByRole.status,
                source: 'GMAIL_SYNC',
                last_activity_date: new Date()
            };

            // Upgrade status if new one is higher
            if (newWeight > oldWeight) {
                updateFields.status = status;
            }

            // Backfill job_id if it was missing before and we now have one
            if (!existingByRole.job_id && job_id) {
                updateFields.job_id = job_id;
            }

            // Only hit DB if something actually changes
            if (updateFields.status !== existingByRole.status || updateFields.job_id) {
                await Application.update(existingByRole.id, userId, {
                    ...updateFields,
                });
                const reasonParts = [];
                if (newWeight > oldWeight) {
                    reasonParts.push(`Status upgraded: ${existingByRole.status} → ${status}`);
                }
                if (!existingByRole.job_id && job_id) {
                    reasonParts.push(`Job ID set to ${job_id}`);
                }
                return { action: 'updated', id: existingByRole.id, reason: reasonParts.join(' | ') || 'Updated from Gmail sync' };
            }

            return { action: 'skipped', id: existingByRole.id, reason: 'Duplicate application (same company + role)' };
        }

        // 2. Check for duplicate by email subject
        const existingBySubject = await this.findByEmailSubject(userId, email_subject);
        if (existingBySubject) {
            // Backfill job_id by subject if missing
            if (!existingBySubject.job_id && job_id) {
                await Application.update(existingBySubject.id, userId, {
                    job_id,
                    source: 'GMAIL_SYNC',
                    last_activity_date: new Date()
                });
                return { action: 'updated', id: existingBySubject.id, reason: `Job ID set to ${job_id} (by email subject match)` };
            }
            return { action: 'skipped', id: existingBySubject.id, reason: 'Duplicate application (same email subject)' };
        }

        // 3. Insert new application using existing model
        const appId = await Application.create({
            user_id: userId,
            company_name: company_name,
            job_title: job_title,
            job_id: job_id,
            job_description: null,
            job_link: null,
            salary_range: null,
            status: status,
            applied_date: applied_date,
            resume_id: null,
            notes: `Auto-imported from Gmail: "${email_subject}"`,
            portal_type: 'GMAIL',
            portal_url: null,
            email_subject: email_subject,
            sender_email: sender_email
        });

        return { action: 'inserted', id: appId };
    }
};

module.exports = ApplicationImporter;
