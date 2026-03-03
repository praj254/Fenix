const ParserService = require('../services/parserService');

const testEmails = [
    {
        name: 'Rejection Email',
        text: 'Unfortunately, we have decided to move forward with other candidates at this time.',
        expected: 'Rejected'
    },
    {
        name: 'Interview Invite',
        text: 'We were impressed by your background and would like to schedule a Zoom interview with the hiring manager.',
        expected: 'Interview'
    },
    {
        name: 'Offer Email',
        text: 'Congratulations! We are pleased to offer you the position. Please find your offer letter attached.',
        expected: 'Offer'
    },
    {
        name: 'Neutral/Marketing',
        text: 'Thank you for your interest in our company. We have received your application.',
        expected: null
    }
];

console.log('--- Testing ParserService ---');
testEmails.forEach(test => {
    const result = ParserService.detectStatus(test.text);
    const detected = result ? result.label : null;
    const passed = detected === test.expected;

    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${test.name}`);
    if (!passed) {
        console.log(`   Expected: ${test.expected}, Got: ${detected}`);
    }
});
