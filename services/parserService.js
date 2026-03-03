/**
 * Status Parser Service
 * A rule-based engine using Regex to detect job application status changes from email text.
 */

const STATUS_MAP = {
    REJECTION: {
        weight: 3,
        label: 'Rejected',
        keywords: [
            /unfortunately/i,
            /not moving forward/i,
            /pursue other candidates/i,
            /filled the position/i,
            /decided to pass/i,
            /other applicants whose skills/i,
            /not selected/i
        ]
    },
    INTERVIEW_INVITE: {
        weight: 4,
        label: 'Interview',
        keywords: [
            /interview/i,
            /schedule a call/i,
            /chat with/i,
            /speak with you/i,
            /availab[ility|le] for/i,
            /zoom/i,
            /google meet/i,
            /hiring manager/i
        ]
    },
    OFFER: {
        weight: 5,
        label: 'Offer',
        keywords: [
            /offer letter/i,
            /congratulations/i,
            /pleased to offer/i,
            /package/i,
            /employment offer/i,
            /join the team/i
        ]
    }
};

const ParserService = {
    /**
     * Analyzes text and returns the detected status category
     * @param {string} text 
     * @returns {Object|null} { category, label, weight }
     */
    detectStatus(text) {
        if (!text) return null;

        // Check from highest weight to lowest (Offer -> Interview -> Rejection)
        const categories = ['OFFER', 'INTERVIEW_INVITE', 'REJECTION'];

        for (const cat of categories) {
            const config = STATUS_MAP[cat];
            for (const regex of config.keywords) {
                if (regex.test(text)) {
                    return {
                        category: cat,
                        label: config.label,
                        weight: config.weight
                    };
                }
            }
        }

        return null;
    }
};

module.exports = ParserService;
