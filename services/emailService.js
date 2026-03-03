const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure =
    (process.env.SMTP_SECURE || '').toLowerCase() === 'true' ||
    port === 465;

  if (!host) {
    throw new Error('SMTP_HOST is missing. Configure SMTP in your .env to send emails.');
  }

  // Most SMTP servers require auth; make the error explicit if missing.
  if (!user || !pass) {
    throw new Error('SMTP_USER/SMTP_PASS is missing. Set both in .env (for Gmail use an App Password).');
  }

  return { host, port, secure, user, pass };
}

function getTransporter() {
  const cfg = getSmtpConfig();
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  });
}

const EmailService = {

  async sendFollowUpReminder({ to, name, company, jobTitle }) {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Fenix" <${process.env.SMTP_USER}>`,
      to,
      subject: `⏰ Follow up with ${company}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#f8faff;border-radius:16px">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;margin:0;font-size:1.5rem">Fenix</h1>
          </div>
          <h2 style="color:#0f172a">Hey ${name} 👋</h2>
          <p style="color:#475569">It's been 14 days since you applied for <strong>${jobTitle}</strong> at <strong>${company}</strong>.</p>
          <p style="color:#475569">Consider sending a follow-up email to check on your application status.</p>
          <div style="background:#ede9fe;border-radius:8px;padding:16px;margin:20px 0">
            <p style="color:#6366f1;margin:0;font-weight:600">💡 Tip: A short, polite follow-up can increase your chances of getting a response.</p>
          </div>
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/applications"
            style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            View Application →
          </a>
          <p style="color:#94a3b8;font-size:0.75rem;margin-top:24px">You're receiving this because you have an active application tracked in Fenix.</p>
        </div>
      `
    });
  },

  async sendGhostedAlert({ to, name, company, jobTitle }) {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Fenix" <${process.env.SMTP_USER}>`,
      to,
      subject: `👻 Application at ${company} marked as Ghosted`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#f8faff;border-radius:16px">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;margin:0;font-size:1.5rem">Fenix</h1>
          </div>
          <h2 style="color:#0f172a">Hey ${name}</h2>
          <p style="color:#475569">Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been automatically marked as <strong>Ghosted</strong> after 30 days of no response.</p>
          <p style="color:#475569">Don't be discouraged — keep applying! Every application is a learning experience. 💪</p>
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/applications"
            style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            View All Applications →
          </a>
        </div>
      `
    });
  },

  async sendWelcome({ to, name }) {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Fenix" <${process.env.SMTP_USER}>`,
      to,
      subject: `🚀 Welcome to Fenix, ${name}!`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#f8faff;border-radius:16px">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;margin:0;font-size:1.5rem">Fenix</h1>
          </div>
          <h2 style="color:#0f172a">Welcome, ${name}! 🎉</h2>
          <p style="color:#475569">Your Fenix account is ready. Start tracking your job applications, get AI-powered insights, and land your dream job.</p>
          <div style="display:grid;gap:12px;margin:20px 0">
            <div style="background:#ede9fe;border-radius:8px;padding:14px">✅ Track unlimited applications</div>
            <div style="background:#ede9fe;border-radius:8px;padding:14px">🤖 AI resume match scoring</div>
            <div style="background:#ede9fe;border-radius:8px;padding:14px">⏰ Automatic follow-up reminders</div>
          </div>
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard"
            style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Go to Dashboard →
          </a>
        </div>
      `
    });
  }

};

module.exports = EmailService;