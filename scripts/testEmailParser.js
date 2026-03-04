const EmailParser = require('../services/emailParser');
const EmailCleaner = require('../services/emailCleaner');

function runSample(label, raw) {
  const cleanBody = EmailCleaner.clean(raw.body);
  const parsed = EmailParser.parse({ ...raw, body: cleanBody });
  console.log('---', label, '---');
  console.log({
    subject: raw.subject,
    from: raw.from,
    fromEmail: raw.fromEmail,
    company_name: parsed.company_name,
    job_title: parsed.job_title,
    job_id: parsed.job_id,
    status: parsed.status,
  });
}

runSample('HSBC',
  {
    subject: '',
    from: 'HSBC Group Talent Acquisition Team',
    fromEmail: 'careers@hsbc.com',
    date: new Date(),
    body: `We’ve got your application for Clt Relationship Mgmt - Supt (Job ID: 32199) at HSBC Group.`
  }
);

runSample('Microsoft',
  {
    subject: '',
    from: 'Microsoft Careers',
    fromEmail: 'careers@microsoft.com',
    date: new Date(),
    body: `Thank you for taking the time to submit your application for Technology Consulting Apprenticeship (Job number: 200026568). We’re glad you’re interested in a career at Microsoft.`
  }
);

runSample('PositionOf',
  {
    subject: '',
    from: 'Some ATS',
    fromEmail: 'noreply@ats.com',
    date: new Date(),
    body: `the position of Software Engineer-25000E58 the`
  }
);

