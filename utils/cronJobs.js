const cron = require('node-cron');
const AutomationService = require('../services/automationService');
const EmailService = require('../services/emailService');
const Application = require('../models/Application');
const { pool } = require('../config/db');

// Follow-Up Reminder — runs daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] Running follow-up reminder job...');
  try {
    const candidates = await AutomationService.getFollowUpCandidates();
    console.log(`   Found ${candidates.length} application(s) needing follow-up`);

    for (const app of candidates) {
      await AutomationService.insertNotification(
        app.user_id,
        app.id,
        `Reminder: You applied to ${app.job_title} at ${app.company_name} 14 days ago. Consider following up!`,
        'reminder'
      );

      await AutomationService.markFollowupSent(app.id);

      try {
        await EmailService.sendFollowUpReminder({
          to: app.email,
          name: app.name,
          company: app.company_name,
          jobTitle: app.job_title
        });
        console.log(`   Follow-up email sent to ${app.email}`);
      } catch (e) {
        console.error('   Email failed:', e.message);
      }

      console.log(`   Follow-up done for app #${app.id} (${app.company_name})`);
    }
  } catch (err) {
    console.error('[CRON] Follow-up job failed:', err.message);
  }
});

// Ghosted Detection — runs daily at 2:30 AM
// Logic: If Applied/Under Review and no activity for 30 days -> mark as Ghosted
cron.schedule('30 2 * * *', async () => {
  console.log('[CRON] Running ghosted detection job...');
  try {
    const [candidates] = await pool.execute(
      `SELECT a.id, a.user_id, a.company_name, a.job_title, u.email, u.name
       FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.status IN ('Applied', 'Under Review')
         AND DATEDIFF(NOW(), a.last_activity_date) >= 30`
    );

    for (const app of candidates) {
      await Application.update(app.id, app.user_id, {
        status: 'Ghosted',
        source: 'SYSTEM_CRON',
        last_activity_date: new Date()
      });

      await AutomationService.insertNotification(
        app.user_id,
        app.id,
        `Your application to ${app.job_title} at ${app.company_name} has been marked as Ghosted after 30 days of no activity.`,
        'ghosted'
      );

      try {
        await EmailService.sendGhostedAlert({
          to: app.email,
          name: app.name,
          company: app.company_name,
          jobTitle: app.job_title
        });
      } catch (e) { }
    }
    console.log(`[CRON] Ghosted job finished. Processed ${candidates.length} apps.`);
  } catch (err) {
    console.error('[CRON] Ghosted detection job failed:', err.message);
  }
});

// Under Review Detection — runs daily at 3:00 AM
// Logic: If Applied and no activity for 7 days -> mark as Under Review
cron.schedule('0 3 * * *', async () => {
  console.log('[CRON] Running under-review detection job...');
  try {
    const [candidates] = await pool.execute(
      `SELECT a.id, a.user_id, a.company_name, a.job_title
       FROM applications a
       WHERE a.status = 'Applied'
         AND DATEDIFF(NOW(), a.last_activity_date) >= 7`
    );

    for (const app of candidates) {
      await Application.update(app.id, app.user_id, {
        status: 'Under Review',
        source: 'SYSTEM_CRON',
        last_activity_date: new Date()
      });
    }
    console.log(`[CRON] Under-review job finished. Processed ${candidates.length} apps.`);
  } catch (err) {
    console.error('[CRON] Under-review job failed:', err.message);
  }
});

console.log('Cron jobs registered (follow-up @ 2:00 AM, ghosted @ 2:30 AM)');

// ─── Gmail Email Sync — runs every 5 minutes ─────────────────
const emailSyncJob = require('../jobs/emailSyncJob');
cron.schedule('*/5 * * * *', async () => {
  try {
    await emailSyncJob.run();
  } catch (err) {
    console.error('[CRON] Gmail sync job failed:', err.message);
  }
});
console.log('Gmail email sync job registered (every 5 minutes)');
