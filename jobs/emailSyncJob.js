/**
 * Email Sync Job
 * Orchestrator: fetches Gmail emails → cleans → classifies → parses → imports.
 * Supports two modes:
 *   - run()          → fetches only UNSEEN emails (for cron, won't re-process)
 *   - runFullScan(days) → fetches ALL emails from last N days (for initial import)
 */

const GmailService = require('../services/gmailService');
const EmailCleaner = require('../services/emailCleaner');
const JobEmailClassifier = require('../services/jobEmailClassifier');
const EmailParser = require('../services/emailParser');
const ApplicationImporter = require('../services/applicationImporter');
const { pool } = require('../config/db');

/**
 * Look up the user_id for the Gmail account configured in .env.
 * Matches GMAIL_USER against the users.email column.
 */
async function resolveUserId() {
    const gmailUser = process.env.GMAIL_USER;
    if (!gmailUser) {
        console.warn('[EMAIL-SYNC] GMAIL_USER not set in .env — skipping sync.');
        return null;
    }

    const [rows] = await pool.execute(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [gmailUser]
    );

    if (!rows.length) {
        console.warn(`[EMAIL-SYNC] No user found with email "${gmailUser}".`);
        console.warn(`[EMAIL-SYNC] Make sure you register with the SAME email as GMAIL_USER in .env.`);
        return null;
    }

    return rows[0].id;
}

/**
 * Process an array of raw emails through the pipeline.
 */
async function processEmails(emails, userId) {
    let inserted = 0, updated = 0, skipped = 0, nonJob = 0, errors = 0;

    for (const rawEmail of emails) {
        try {
            // Clean the body
            const cleanBody = EmailCleaner.clean(rawEmail.body);

            // Classify — is this a job email?
            const classification = JobEmailClassifier.classify(rawEmail.subject, cleanBody);
            if (!classification.isJobEmail) {
                nonJob++;
                continue;
            }

            // Parse structured data
            const emailForParsing = { ...rawEmail, body: cleanBody };
            const parsedData = EmailParser.parse(emailForParsing);

            // Import (with duplicate check)
            const result = await ApplicationImporter.importApplication(userId, parsedData);

            switch (result.action) {
                case 'inserted':
                    inserted++;
                    console.log(`  ✅ Inserted: ${parsedData.company_name} — ${parsedData.job_title} (${parsedData.status})`);
                    break;
                case 'updated':
                    updated++;
                    console.log(`  🔄 Updated: ${parsedData.company_name} — ${result.reason}`);
                    break;
                case 'skipped':
                    skipped++;
                    break;
            }
        } catch (err) {
            errors++;
            console.error(`  ❌ Error processing email "${rawEmail.subject}":`, err.message);
        }
    }

    return { inserted, updated, skipped, nonJob, errors };
}

const EmailSyncJob = {

    /**
     * Run a standard sync cycle (UNSEEN emails only — for cron).
     */
    async run() {
        const startTime = Date.now();
        console.log('[EMAIL-SYNC] Starting Gmail sync (unseen only)...');

        const userId = await resolveUserId();
        if (!userId) return { error: 'No matching user found' };

        let emails;
        try {
            emails = await GmailService.fetchUnseenEmails();
        } catch (err) {
            console.error('[EMAIL-SYNC] Failed to fetch emails:', err.message);
            return { error: err.message };
        }

        if (!emails.length) {
            console.log('[EMAIL-SYNC] No new unseen emails.');
            return { inserted: 0, updated: 0, skipped: 0, nonJob: 0, errors: 0, total: 0 };
        }

        console.log(`[EMAIL-SYNC] Fetched ${emails.length} unseen email(s). Processing...`);
        const results = await processEmails(emails, userId);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[EMAIL-SYNC] Done in ${elapsed}s — Inserted: ${results.inserted}, Updated: ${results.updated}, Skipped: ${results.skipped}, Non-job: ${results.nonJob}, Errors: ${results.errors}`);

        return { ...results, total: emails.length };
    },

    /**
     * Run a full scan of recent emails (ALL emails from last N days — for initial import).
     * @param {number} days - Number of days to look back (default: 30)
     */
    async runFullScan(days = 30) {
        const startTime = Date.now();
        console.log(`[EMAIL-SYNC] Starting FULL Gmail scan (last ${days} days)...`);

        const userId = await resolveUserId();
        if (!userId) return { error: 'No matching user found. Register with the same email as GMAIL_USER in .env.' };

        let emails;
        try {
            emails = await GmailService.fetchRecentEmails(days);
        } catch (err) {
            console.error('[EMAIL-SYNC] Failed to fetch emails:', err.message);
            return { error: err.message };
        }

        if (!emails.length) {
            console.log('[EMAIL-SYNC] No emails found in the last ' + days + ' days.');
            return { inserted: 0, updated: 0, skipped: 0, nonJob: 0, errors: 0, total: 0 };
        }

        console.log(`[EMAIL-SYNC] Fetched ${emails.length} email(s) from last ${days} days. Processing...`);
        const results = await processEmails(emails, userId);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[EMAIL-SYNC] Full scan done in ${elapsed}s — Inserted: ${results.inserted}, Updated: ${results.updated}, Skipped: ${results.skipped}, Non-job: ${results.nonJob}, Errors: ${results.errors}`);

        return { ...results, total: emails.length };
    }
};

module.exports = EmailSyncJob;
