const cron = require('node-cron');
const AutomationService = require('../services/automationService');
const EmailService = require('../services/emailService');

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
cron.schedule('30 2 * * *', async () => {
  console.log('[CRON] Running ghosted detection job...');
  try {
    const candidates = await AutomationService.getGhostedCandidates();
    console.log(`   Found ${candidates.length} application(s) to mark as ghosted`);

    for (const app of candidates) {
      await AutomationService.markAsGhosted(app.id);

      await AutomationService.insertNotification(
        app.user_id,
        app.id,
        `Your application to ${app.job_title} at ${app.company_name} has been marked as Ghosted after 30 days of no response.`,
        'ghosted'
      );

      try {
        await EmailService.sendGhostedAlert({
          to: app.email,
          name: app.name,
          company: app.company_name,
          jobTitle: app.job_title
        });
        console.log(`   Ghosted email sent to ${app.email}`);
      } catch (e) {
        console.error('   Email failed:', e.message);
      }

      console.log(`   Marked app #${app.id} (${app.company_name}) as Ghosted`);
    }
  } catch (err) {
    console.error('[CRON] Ghosted detection job failed:', err.message);
  }
});

console.log('Cron jobs registered (follow-up @ 2:00 AM, ghosted @ 2:30 AM)');