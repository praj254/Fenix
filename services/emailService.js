const nodemailer = require('nodemailer');

/* ═══════════════════════════════════════════════════════════════
   SMTP Config
   ═══════════════════════════════════════════════════════════════ */
function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure =
    (process.env.SMTP_SECURE || '').toLowerCase() === 'true' ||
    port === 465;

  if (!host) throw new Error('SMTP_HOST is missing. Configure SMTP in your .env to send emails.');
  if (!user || !pass) throw new Error('SMTP_USER/SMTP_PASS is missing. Set both in .env (for Gmail use an App Password).');

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

/* ═══════════════════════════════════════════════════════════════
   Shared Email Shell  —  dark premium design
   ═══════════════════════════════════════════════════════════════ */
function emailShell({ preheader = '', body = '', accentColor = '#6366f1', accentColorEnd = '#8b5cf6' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Fenix</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0a0a12;font-family:'Segoe UI',Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a12;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- ── HEADER LOGO BAR ── -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="
                    background:linear-gradient(135deg,${accentColor},${accentColorEnd});
                    border-radius:14px;
                    padding:10px 20px 10px 10px;
                    line-height:1;
                  ">
                    <!-- Fenix slash logo inline SVG -->
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;">
                          <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="28" height="28" rx="7" fill="rgba(255,255,255,0.15)"/>
                            <line x1="8" y1="20" x2="20" y2="8" stroke="white" stroke-width="2.8" stroke-linecap="round"/>
                          </svg>
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="color:white;font-size:1.15rem;font-weight:800;letter-spacing:-0.02em;">Fenix</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── MAIN CARD ── -->
          <tr>
            <td style="
              background:#13131f;
              border-radius:20px;
              border:1px solid rgba(255,255,255,0.06);
              overflow:hidden;
              box-shadow:0 24px 80px rgba(0,0,0,0.5);
            ">
              <!-- Gradient top stripe -->
              <div style="height:4px;background:linear-gradient(90deg,${accentColor},${accentColorEnd},#ec4899);"></div>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:40px 40px 36px;">
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="color:#3f3f5a;font-size:0.72rem;line-height:1.6;margin:0;">
                You're receiving this email because you have a Fenix account.<br>
                © ${new Date().getFullYear()} Fenix · All rights reserved.<br>
                <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="color:#6366f1;text-decoration:none;">fenix.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ── Reusable CTA button ────────────────────────────────────── */
function ctaBtn(href, text, color = '#6366f1', colorEnd = '#8b5cf6') {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
      <tr>
        <td style="
          background:linear-gradient(135deg,${color},${colorEnd});
          border-radius:10px;
          box-shadow:0 4px 20px rgba(99,102,241,0.4);
        ">
          <a href="${href}" style="
            display:inline-block;
            padding:14px 28px;
            color:white;
            text-decoration:none;
            font-weight:700;
            font-size:0.9rem;
            letter-spacing:0.01em;
            white-space:nowrap;
          ">${text} &rarr;</a>
        </td>
      </tr>
    </table>`;
}

/* ── Highlight pill/badge ───────────────────────────────────── */
function pill(text, color = '#6366f1') {
  return `<span style="
    display:inline-block;
    background:${color}22;
    color:${color};
    border:1px solid ${color}44;
    border-radius:100px;
    padding:3px 12px;
    font-size:0.78rem;
    font-weight:700;
    letter-spacing:0.04em;
    text-transform:uppercase;
  ">${text}</span>`;
}

/* ── Info card block ────────────────────────────────────────── */
function infoCard(icon, title, body, accentColor = '#6366f1') {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
      <tr>
        <td style="
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.06);
          border-left:3px solid ${accentColor};
          border-radius:10px;
          padding:14px 16px;
        ">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="font-size:1.3rem;width:34px;vertical-align:middle;">${icon}</td>
              <td style="padding-left:10px;vertical-align:middle;">
                <div style="color:rgba(255,255,255,0.45);font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">${title}</div>
                <div style="color:#e2e8f0;font-size:0.9rem;font-weight:600;">${body}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/* ── Feature bullet row ─────────────────────────────────────── */
function featureRow(icon, text) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
      <tr>
        <td style="
          background:rgba(99,102,241,0.06);
          border:1px solid rgba(99,102,241,0.12);
          border-radius:10px;
          padding:14px 16px;
        ">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:1.2rem;width:32px;vertical-align:middle;">${icon}</td>
              <td style="padding-left:10px;color:#c4c4f0;font-size:0.875rem;font-weight:500;vertical-align:middle;">${text}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/* ═══════════════════════════════════════════════════════════════
   Email Service
   ═══════════════════════════════════════════════════════════════ */
const EmailService = {

  /* ─── 1. Follow-Up Reminder ─────────────────────────────── */
  async sendFollowUpReminder({ to, name, company, jobTitle }) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const transporter = getTransporter();

    const body = `
      <!-- Label -->
      <div style="margin-bottom:20px;">${pill('Follow-up Reminder', '#f59e0b')}</div>

      <!-- Headline -->
      <h1 style="color:#f1f5f9;font-size:1.6rem;font-weight:800;line-height:1.25;margin:0 0 10px;letter-spacing:-0.02em;">
        Time to follow up,<br>${name} 👋
      </h1>
      <p style="color:#64748b;font-size:0.93rem;line-height:1.6;margin:0 0 28px;">
        It's been <strong style="color:#f59e0b;">14 days</strong> since your application.
        A short, polite follow-up can be the nudge that gets you a response.
      </p>

      <!-- Application Details -->
      ${infoCard('💼', 'Role', jobTitle, '#6366f1')}
      ${infoCard('🏢', 'Company', company, '#8b5cf6')}

      <!-- Tip box -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;margin-bottom:4px;">
        <tr>
          <td style="
            background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03));
            border:1px solid rgba(245,158,11,0.2);
            border-radius:12px;
            padding:18px 20px;
          ">
            <div style="color:#fbbf24;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">✨ Pro Tip</div>
            <p style="color:#cbd5e1;font-size:0.87rem;line-height:1.6;margin:0;">
              Keep it short — 3–4 sentences. Reiterate your enthusiasm, ask politely about next steps,
              and attach your resume again. Timing it on a <strong style="color:#fcd34d;">Tuesday or Wednesday morning</strong> gets the best open rates.
            </p>
          </td>
        </tr>
      </table>

      ${ctaBtn(`${appUrl}/applications`, 'View Your Application', '#f59e0b', '#f97316')}

      <p style="color:#3f3f5a;font-size:0.78rem;line-height:1.5;margin-top:28px;">
        This reminder was generated by Fenix based on your application timeline. You can manage reminder settings in your dashboard.
      </p>
    `;

    await transporter.sendMail({
      from: `"Fenix" <${process.env.SMTP_USER}>`,
      to,
      subject: `⏰ Don't forget to follow up with ${company}`,
      html: emailShell({
        preheader: `Your application for ${jobTitle} at ${company} is 14 days old — time to send a follow-up!`,
        body,
        accentColor: '#f59e0b',
        accentColorEnd: '#f97316',
      }),
    });
  },

  /* ─── 2. Ghosted Alert ───────────────────────────────────── */
  async sendGhostedAlert({ to, name, company, jobTitle }) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const transporter = getTransporter();

    const body = `
      <!-- Label -->
      <div style="margin-bottom:20px;">${pill('No Response · 30 Days', '#8b5cf6')}</div>

      <!-- Big ghosted visual -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:4rem;line-height:1;margin-bottom:12px;">👻</div>
        <h1 style="color:#f1f5f9;font-size:1.5rem;font-weight:800;line-height:1.25;margin:0;letter-spacing:-0.02em;">
          Looks like they ghosted you, ${name.split(' ')[0]}
        </h1>
      </div>

      <p style="color:#64748b;font-size:0.93rem;line-height:1.6;margin:0 0 24px;text-align:center;">
        Your application for <strong style="color:#e2e8f0;">${jobTitle}</strong> at <strong style="color:#e2e8f0;">${company}</strong>
        has been marked as <strong style="color:#a78bfa;">Ghosted</strong> after 30 days with no response.
      </p>

      <!-- Divider -->
      <div style="height:1px;background:rgba(255,255,255,0.06);margin:20px 0;"></div>

      <!-- Resilience section -->
      <div style="text-align:center;margin-bottom:20px;">
        <div style="color:#a78bfa;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">
          What to do next
        </div>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
        background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,102,241,0.04));
        border:1px solid rgba(139,92,246,0.15);
        border-radius:14px;
        padding:20px 22px;
        margin-bottom:8px;
      ">
        <tr>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#cbd5e1;font-size:0.87rem;padding:6px 0 6px 0;">
                  💌 &nbsp;<strong style="color:#e2e8f0;">Try once more</strong> — send a final short note. Sometimes things slip through.
                </td>
              </tr>
              <tr>
                <td style="color:#cbd5e1;font-size:0.87rem;padding:6px 0 6px 0;">
                  🔄 &nbsp;<strong style="color:#e2e8f0;">Keep applying</strong> — every rejection is redirection.
                </td>
              </tr>
              <tr>
                <td style="color:#cbd5e1;font-size:0.87rem;padding:6px 0 6px 0;">
                  📊 &nbsp;<strong style="color:#e2e8f0;">Review your stats</strong> — Fenix AI can analyze what's working.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Quote -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
        <tr>
          <td style="
            border-left:3px solid #8b5cf6;
            padding:12px 18px;
          ">
            <p style="color:#7c7ca8;font-size:0.87rem;font-style:italic;line-height:1.6;margin:0;">
              "The phoenix must burn to emerge." — Every application brings you closer. 🔥
            </p>
          </td>
        </tr>
      </table>

      ${ctaBtn(`${appUrl}/applications`, 'View All Applications', '#8b5cf6', '#6366f1')}

      <p style="color:#3f3f5a;font-size:0.78rem;line-height:1.5;margin-top:28px;">
        This alert was automatically triggered by Fenix after 30 days without a status update on your application.
      </p>
    `;

    await transporter.sendMail({
      from: `"Fenix" <${process.env.SMTP_USER}>`,
      to,
      subject: `👻 ${company} hasn't responded — your application is marked Ghosted`,
      html: emailShell({
        preheader: `Your ${jobTitle} application at ${company} has been marked as ghosted after 30 days. Here's what to do next.`,
        body,
        accentColor: '#8b5cf6',
        accentColorEnd: '#6366f1',
      }),
    });
  },

  /* 3. Welcome Email */
  async sendWelcome({ to, name }) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const transporter = getTransporter();

    const body = `
      <!-- Hero -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="
          display:inline-block;
          background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08));
          border:1px solid rgba(99,102,241,0.2);
          border-radius:50%;
          width:72px;height:72px;
          line-height:72px;
          font-size:2rem;
          margin-bottom:20px;
        ">🚀</div>
        <h1 style="color:#f1f5f9;font-size:1.8rem;font-weight:800;line-height:1.2;margin:0 0 10px;letter-spacing:-0.03em;">
          Welcome to Fenix,<br>
          <span style="background:linear-gradient(135deg,#6366f1,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${name}!</span>
        </h1>
        <p style="color:#64748b;font-size:0.95rem;line-height:1.65;margin:0 auto;max-width:380px;">
          Your job search just got a serious upgrade. Here's everything waiting for you inside.
        </p>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent);margin:0 0 28px;"></div>

      <!-- Features -->
      <div style="margin-bottom:24px;">
        ${featureRow('📋', 'Track unlimited applications — never lose track of where you applied')}
        ${featureRow('🤖', 'AI resume match scoring — see how well your resume fits each role')}
        ${featureRow('⏰', 'Auto follow-up reminders — get nudged before applications go cold')}
        ${featureRow('📊', 'Visual analytics dashboard — understand your job search at a glance')}
        ${featureRow('👻', 'Ghosted detection — automatically flag dead-end applications')}
      </div>

      <!-- Divider -->
      <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 0 24px;"></div>

      <!-- Getting started section -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
        background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.05));
        border:1px solid rgba(99,102,241,0.15);
        border-radius:14px;
        padding:20px 22px;
        margin-bottom:4px;
      ">
        <tr>
          <td>
            <div style="color:#a78bfa;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
              🗺️ Start here
            </div>
            <p style="color:#94a3b8;font-size:0.87rem;line-height:1.65;margin:0;">
              Head to your <strong style="color:#e2e8f0;">Dashboard</strong> and hit
              <strong style="color:#e2e8f0;">"Add Application"</strong> to log your first job.
              The AI will start analyzing patterns as soon as you have a few entries in.
            </p>
          </td>
        </tr>
      </table>

      ${ctaBtn(`${appUrl}/dashboard`, 'Go to My Dashboard', '#6366f1', '#8b5cf6')}

      <!-- Sign-off -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;border-top:1px solid rgba(255,255,255,0.05);padding-top:24px;">
        <tr>
          <td>
            <p style="color:#475569;font-size:0.88rem;line-height:1.6;margin:0;">
              Excited to have you here,<br>
              <strong style="color:#c4c4f0;">The Fenix Team</strong> 🔥
            </p>
          </td>
        </tr>
      </table>
    `;

    await transporter.sendMail({
      from: `"Fenix" <${process.env.SMTP_USER}>`,
      to,
      subject: `🚀 Welcome to Fenix, ${name} — let's get you hired`,
      html: emailShell({
        preheader: `Your Fenix account is ready. Track applications, get AI insights, and land your dream job.`,
        body,
        accentColor: '#6366f1',
        accentColorEnd: '#8b5cf6',
      }),
    });
  },

  /* 4. Login Alert */
  async sendLoginAlert({ to, name, device, ip, time }) {
    const transporter = getTransporter();
    const body = `
      <div style="margin-bottom:20px;">${pill('Security Alert', '#ef4444')}</div>
      <h1 style="color:#f1f5f9;font-size:1.6rem;font-weight:800;line-height:1.25;margin:0 0 10px;">
        New Login Detected
      </h1>
      <p style="color:#64748b;font-size:0.95rem;line-height:1.6;margin:0 0 20px;">
        Hi ${name}, we noticed a login to your account from an unrecognized device.
      </p>
      ${infoCard('💻', 'Device', device || 'Unknown', '#ef4444')}
      ${infoCard('🌐', 'IP Address', ip || 'Unknown', '#ef4444')}
      ${infoCard('🕒', 'Time', time, '#ef4444')}
      <p style="color:#64748b;font-size:0.85rem;line-height:1.5;margin-top:20px;">
        If this was you, you can safely ignore this email. If not, please change your password immediately.
      </p>
    `;
    await transporter.sendMail({
      from: `"Fenix Security" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Security Alert: New Login Detected',
      html: emailShell({ preheader: 'We detected a login from a new device.', body, accentColor: '#ef4444', accentColorEnd: '#dc2626' })
    });
  },

  /* 5. 2FA Code  */
  async send2FAEmail({ to, name, code }) {
    const transporter = getTransporter();
    const body = `
      <div style="margin-bottom:20px;">${pill('Your Verification Code', '#6366f1')}</div>
      <h1 style="color:#f1f5f9;font-size:1.6rem;font-weight:800;line-height:1.25;margin:0 0 20px;">
        Login Verification
      </h1>
      <p style="color:#64748b;font-size:0.95rem;line-height:1.6;margin:0 0 20px;">
        Hi ${name}, enter the following 6-digit code to complete your login. It expires in 10 minutes.
      </p>
      <div style="background:#6366f1;padding:20px;text-align:center;border-radius:12px;margin-bottom:20px;">
        <span style="font-size:2rem;font-weight:800;letter-spacing:0.2em;color:#ffffff;">${code}</span>
      </div>
      <p style="color:#64748b;font-size:0.85rem;line-height:1.5;">
        If you didn't request this, please change your password immediately.
      </p>
    `;
    await transporter.sendMail({
      from: `"Fenix Security" <${process.env.SMTP_USER}>`,
      to,
      subject: `${code} is your Fenix login code`,
      html: emailShell({ preheader: `Your login verification code is ${code}`, body, accentColor: '#6366f1', accentColorEnd: '#8b5cf6' })
    });
  }

};

module.exports = EmailService;