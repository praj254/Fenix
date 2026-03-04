const ParserService = require('./parserService');

function extractCompanyName(fromName, fromEmail, subject, body) {
    // ── Strategy 1: Extract from email body patterns ──
    const bodyPatterns = [
        // "application for <Role> (Job ID: 12345) at <Company>"
        /application\s+for\s+[A-Z][A-Za-z0-9\s\/&.,'-]+?(?:\s*\([^)]+\))?\s+at\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\s+team|\s+hiring|\s+recruiting)?[\s.,!:\n]/i,
        /(?:thank\s+you\s+for\s+(?:your\s+)?(?:interest\s+in|applying\s+(?:in|to|at|with))(?:\s+(?:a\s+)?(?:position|role)\s+(?:at|with))?)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\s+team|\s+hiring|\s+recruiting)?[\s.,!:\n]/i,
        // Avoid treating "your application for <Role>" as a company; only to/at/with
        /(?:your\s+application\s+(?:to|at|with))\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\s+team|\s+hiring|\s+recruiting)?[\s.,!:\n]/i,
        /(?:on\s+behalf\s+of)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\s+team|\s+hiring|\s+recruiting)?[\s.,!:\n]/i,
        /(?:team\s+at|team\s+from|from\s+the\s+team\s+at)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)[\s.,!:\n]/i,
        /(?:welcome\s+to)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)[\s.,!:\n]/i,
        // "career at Microsoft"
        /career\s+at\s+([A-Z][A-Za-z0-9\s&.,'-]+?)[\s.,!:\n]/i,
        /(?:position\s+at|role\s+at|opportunity\s+at|job\s+at)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)[\s.,!:\n]/i,
    ];

    for (const pat of bodyPatterns) {
        const match = (body || '').match(pat);
        if (match && match[1]) {
            let name = match[1].trim();
            name = name.replace(/\s+(?:for|the|and|or|in|at|to|with)$/i, '');
            name = name.replace(/^(?:the|an?)\s+/i, '');
            if (name.length > 1 && name.length < 50) return name;
        }
    }

    // ── Strategy 2: Extract from subject line ──
    const subjectPatterns = [
        /(?:application|applied)\s+(?:to|at|for|with)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\s+[-–—|:]|\s+for\s+|\s*$)/i,
        /(?:from|at)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\s+[-–—|:]|\s+for\s+|\s*$)/i,
        /^([A-Z][A-Za-z0-9\s&.,'-]+?)\s*[-–—|:]\s*(?:application|interview|offer|assessment|your|update)/i,
        /(?:update\s+from)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)$/i
    ];

    for (const pat of subjectPatterns) {
        const match = (subject || '').match(pat);
        if (match && match[1]) {
            let name = match[1].trim();
            name = name.replace(/\s+(?:for|the|and|or|in|at|to|with)$/i, '');
            name = name.replace(/^(?:the|an?)\s+/i, '');
            if (name.length > 1 && name.length < 50) return name;
        }
    }

    // ── Strategy 3: Extract from sender "from" name ──
    if (fromName) {
        const cleaned = fromName
            .replace(/\b(careers?|jobs?|recruiting|recruitment|talent|hr|hiring|team|no[- ]?reply|notifications?|support|info|do[- ]?not[- ]?reply|via|system)\b/gi, '')
            .replace(/[<>"']/g, '')
            .replace(/[-–—|:]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleaned.length > 1 && cleaned.length < 50) {
            return cleaned;
        }
    }

    // ── Strategy 4: Derive from sender email domain ──
    if (fromEmail) {
        const domain = fromEmail.split('@')[1];
        if (domain) {
            const parts = domain.split('.');
            const companyPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            const genericProviders = ['gmail', 'yahoo', 'outlook', 'hotmail', 'aol', 'icloud', 'protonmail', 'mail', 'zoho', 'yandex'];

            if (!genericProviders.includes(companyPart.toLowerCase())) {
                return companyPart
                    .replace(/[-_]/g, ' ')
                    .split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
            }
        }
    }

    return 'Unknown Company';
}

/**
 * Try to extract Job ID from email content
 */
function extractJobId(subject, body) {
    const combined = `${subject || ''}\n${body || ''}`;
    const patterns = [
        // "the position of Software Engineer-25000E58"
        /position\s+of\s+[A-Z][A-Za-z0-9\s\/&.,'-]+?-([A-Z0-9]{4,12})\b/i,
        /\b(?:Job|Req|Requisition)\s+(?:ID|No|Number)[:\-#\s]*([A-Z0-9]+(?:[-_][A-Z0-9]+)*)\b/i,
        /#[A-Z0-9]{4,12}\b/, // e.g. #123456
        /\((?:Ref|ID|Req)[:\-#\s]*([A-Z0-9]+)\)/i,
        // Plain numeric ID in brackets after the role, e.g. "(28909)"
        /\(([0-9]{4,12})\)/
    ];

    for (const pat of patterns) {
        const match = combined.match(pat);
        if (match && match[1] && match[1].trim().length >= 4) {
            return match[1].trim();
        } else if (match && match[0] && match[0].startsWith('#')) {
            return match[0].trim();
        }
    }
    return null;
}

/**
 * Try to extract job role from email content
 */
function extractJobRole(subject, body) {
    const patterns = [
        /(?:position|role|job\s+title|applied\s+for|application\s+for)\s*[:\-–—]?\s*([A-Z][A-Za-z0-9\s\/&.,'-]+?)(?:\s+(?:at|with|in|position|role|[-–—|])|\s*[.\n!()]?)/i,
        /(?:for\s+the)\s+([A-Z][A-Za-z0-9\s\/&.,'-]+?)\s+(?:position|role|opening|job)/i,
        // Common role patterns in subject line (greedy)
        /[-–—|:]\s*([A-Z][A-Za-z0-9\s\/&.,'-]+?(?:Engineer|Developer|Designer|Manager|Analyst|Scientist|Intern|Associate|Consultant|Architect|Director|Lead|Specialist|Coordinator|Administrator|Executive|Officer|Representative|Counsel|Staff|Apprentice|Trainee)(?:\s+(?:I|II|III|IV|Senior|Staff|Principal|Lead|Sr\.?|Jr\.?))?)\s*(?:[-–—|:]|$)/i,
        /([A-Z][A-Za-z0-9\s\/&.,'-]+?(?:Engineer|Developer|Designer|Manager|Analyst|Scientist|Intern|Associate|Consultant|Architect|Director|Lead|Specialist|Coordinator|Administrator|Executive|Officer|Representative|Counsel|Staff|Apprentice|Trainee)(?:\s+(?:I|II|III|IV|Senior|Staff|Principal|Lead|Sr\.?|Jr\.?))?)\s*[-–—|:]/i,
        // "regarding your <role> application"
        /(?:regarding\s+(?:your|the))\s+([A-Z][A-Za-z0-9\s\/&.,'-]+?)\s+(?:application|position|role|job|candidacy)/i,
    ];

    let extractedRole = 'Unknown Role';

    const cleanRole = (roleStr) => {
        let cleaned = roleStr.trim()
            // Drop leading "the position of" / "position of" / "role of"
            .replace(/^(?:the\s+)?(?:position|role)\s+of\s+/i, '')
            // Drop trailing "-25000E58" style job codes
            .replace(/[-–—]\s*[A-Z0-9]{4,12}\s*$/i, '')
            // Drop trailing "(Job ID: 12345)" or "(Job number: 12345)" or "(12345)"
            .replace(/\(\s*(?:Job|Req|Requisition)\s+(?:ID|No|Number)[:\-#\s]*[A-Z0-9]+(?:[-_][A-Z0-9]+)*\s*\)\s*$/i, '')
            .replace(/\(\s*Job\s+number[:\-#\s]*[A-Z0-9]+(?:[-_][A-Z0-9]+)*\s*\)\s*$/i, '')
            .replace(/\(\s*[0-9]{3,}\s*\)\s*$/i, '')
            .replace(/\s+(?:for|the|and|or|in|at|to|with|application|position|role|job)$/i, '')
            .replace(/^(?:the|an?)\s+/i, '')
            .replace(/^[-–—|:\s]+/, '')
            .replace(/[-–—|:\s]+$/, '')
            .trim();
        return (cleaned.length > 2 && cleaned.length < 80) ? cleaned : null;
    };

    // Check subject first
    for (const pat of patterns) {
        const match = (subject || '').match(pat);
        if (match && match[1]) {
            const cleaned = cleanRole(match[1]);
            if (cleaned) {
                extractedRole = cleaned;
                break;
            }
        }
    }

    // Then check body if not found in subject
    if (extractedRole === 'Unknown Role') {
        for (const pat of patterns) {
            const match = (body || '').match(pat);
            if (match && match[1]) {
                const cleaned = cleanRole(match[1]);
                if (cleaned) {
                    extractedRole = cleaned;
                    break;
                }
            }
        }
    }

    return extractedRole;
}



/**
 * Detect application status from email content.
 * Uses existing parserService.detectStatus() and adds Assessment/Applied detection.
 */
function detectStatus(subject, body) {
    const combined = `${subject || ''} ${body || ''}`;

    // Check for Assessment status (not covered by parserService)
    const assessmentPatterns = [
        /\bcoding\s+(?:challenge|assessment|test)\b/i,
        /\btechnical\s+assessment\b/i,
        /\bonline\s+(?:test|assessment)\b/i,
        /\btake[- ]home\s+(?:assignment|challenge|test)\b/i,
        /\bhackerrank\b/i,
        /\bcodility\b/i,
        /\bleetcode\b/i,
        /\bcomplete\s+(?:the|this|an?)\s+(?:assessment|challenge)\b/i,
    ];
    for (const pat of assessmentPatterns) {
        if (pat.test(combined)) return 'Assessment';
    }

    // Use existing parserService for Offer, Interview, Rejection
    const detected = ParserService.detectStatus(combined);
    if (detected) return detected.label;

    // Check for explicit "application received" / "applied" confirmation
    const appliedPatterns = [
        /\bthank\s+you\s+for\s+(?:your\s+)?(?:applying|application|interest)\b/i,
        /\bapplication\s+(?:has\s+been\s+)?(?:received|submitted|confirmed)\b/i,
        /\bwe\s+(?:have\s+)?received\s+your\s+application\b/i,
        /\bsuccessfully\s+(?:applied|submitted)\b/i,
    ];
    for (const pat of appliedPatterns) {
        if (pat.test(combined)) return 'Applied';
    }

    return 'Applied'; // Default to Applied if it passed the classifier
}

const EmailParser = {

    /**
     * Parse a job email into a structured application object.
     * @param {{ subject: string, from: string, fromEmail: string, date: Date, body: string }} email
     * @returns {Object} Parsed application data
     */
    parse(email) {
        const { subject, from, fromEmail, date, body } = email;

        return {
            company_name: extractCompanyName(from, fromEmail, subject, body),
            job_title: extractJobRole(subject, body),
            job_id: extractJobId(subject, body),
            status: detectStatus(subject, body),
            applied_date: date ? new Date(date) : new Date(),
            location: null, // location extraction removed per user request
            email_subject: (subject || '').substring(0, 255),
            sender_email: (fromEmail || '').substring(0, 255),
        };
    }
};

module.exports = EmailParser;
