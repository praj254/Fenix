/**
 * Job Email Classifier
 * Determines whether an email is related to a job application using keyword matching.
 */

// Keywords grouped by relevance strength
const HIGH_CONFIDENCE_KEYWORDS = [
    /\bthank\s+you\s+for\s+applying\b/i,
    /\bapplication\s+received\b/i,
    /\bapplication\s+(?:has\s+been\s+)?(?:submitted|confirmed)\b/i,
    /\binterview\s+invitation\b/i,
    /\bnext\s+steps?\s+in\s+your\s+application\b/i,
    /\bwe\s+regret\s+to\s+inform\b/i,
    /\bnot\s+(?:been\s+)?(?:selected|moving\s+forward)\b/i,
    /\boffer\s+letter\b/i,
    /\bcoding\s+(?:challenge|assessment|test)\b/i,
    /\btechnical\s+assessment\b/i,
    /\bhiring\s+(?:process|team|manager)\b/i,
    /\bpleased\s+to\s+offer\b/i,
    /\bwe\s+are\s+excited\s+to\s+offer\b/i,
    /\bschedule\s+(?:an?\s+)?interview\b/i,
    /\byour\s+application\s+(?:for|to|at)\b/i,
    /\bapplication\s+status\b/i,
    /\bjob\s+application\b/i,
    /\bmoving\s+forward\b/i,
    /\btake(?:-|\s+)home\s+assignment\b/i,
    /\bhackerrank\b/i,
    /\bcodility\b/i
];

const MEDIUM_CONFIDENCE_KEYWORDS = [
    /\bappl(?:y|ied|ication|icant)\b/i,
    /\binterview\b/i,
    /\bcandidate\b/i,
    /\bposition\b/i,
    /\bopportunity\b/i,
    /\bassessment\b/i,
    /\brecruiter\b/i,
    /\bresume\b/i,
    /\bjob\s+opening\b/i,
    /\brole\b/i,
    /\bhiring\b/i,
    /\btalent\s+(?:team|acquisition)\b/i,
    /\bonboarding\b/i,
    /\bbackground\s+check\b/i,
    /\bcareers?|jobs?|recruiting\b/i,
    /\bnext\s+steps\b/i,
    /\bportfolio\b/i
];

// Negative keywords — emails matching these are likely NOT job-related
const NEGATIVE_KEYWORDS = [
    /\border\s+confirm/i,
    /\bshipping\s+(?:update|notification)\b/i,
    /\byour\s+(?:package|delivery|shipment)\b/i,
    /\bpassword\s+reset\b/i,
    /\bsubscription\s+(?:renewal|confirm)/i,
    /\bnewsletter\b/i,
    /\bpromotional\b/i,
    /\bdiscount\s+code\b/i,
    /\bverify\s+your\s+(?:email|account)\b/i,
    /\btwo[- ]?factor\b/i,
    /\blogin\s+code\b/i,
    /\bfenix\b/i,  // Ignore emails from our own platform
];

const JobEmailClassifier = {

    /**
     * Classify whether an email is job-related.
     * @param {string} subject - Email subject line
     * @param {string} body - Clean plaintext email body
     * @returns {{ isJobEmail: boolean, confidence: 'high'|'medium'|'low'|'none' }}
     */
    classify(subject, body) {
        const combined = `${subject || ''} ${body || ''}`;

        // Check negative keywords first — if matched, likely not a job email
        for (const neg of NEGATIVE_KEYWORDS) {
            if (neg.test(subject || '')) {
                return { isJobEmail: false, confidence: 'none' };
            }
        }

        // Check high confidence keywords
        let highMatches = 0;
        for (const kw of HIGH_CONFIDENCE_KEYWORDS) {
            if (kw.test(combined)) highMatches++;
        }
        if (highMatches >= 1) {
            return { isJobEmail: true, confidence: 'high' };
        }

        // Check medium confidence keywords — need at least 2 matches
        let mediumMatches = 0;
        for (const kw of MEDIUM_CONFIDENCE_KEYWORDS) {
            if (kw.test(combined)) mediumMatches++;
        }
        if (mediumMatches >= 3) {
            return { isJobEmail: true, confidence: 'high' };
        }
        if (mediumMatches >= 2) {
            return { isJobEmail: true, confidence: 'medium' };
        }

        return { isJobEmail: false, confidence: 'none' };
    }
};

module.exports = JobEmailClassifier;
