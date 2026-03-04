/**
 * Email Cleaner / Normalizer
 * Converts raw HTML email bodies to clean plaintext for parsing.
 */

const EmailCleaner = {

    /**
     * Clean an email body: strip HTML, decode entities, remove footers, normalize whitespace.
     * @param {string} rawBody - The raw email body (may contain HTML)
     * @returns {string} Clean plaintext
     */
    clean(rawBody) {
        if (!rawBody) return '';

        let text = rawBody;

        // 1. Remove style and script blocks entirely
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

        // 2. Replace <br>, <p>, <div>, <li>, <tr> with newlines for readability
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/?(p|div|tr|li|h[1-6])\b[^>]*>/gi, '\n');

        // 3. Strip all remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // 4. Decode common HTML entities
        text = text.replace(/&nbsp;/gi, ' ');
        text = text.replace(/&amp;/gi, '&');
        text = text.replace(/&lt;/gi, '<');
        text = text.replace(/&gt;/gi, '>');
        text = text.replace(/&quot;/gi, '"');
        text = text.replace(/&#39;/gi, "'");
        text = text.replace(/&apos;/gi, "'");
        text = text.replace(/&#x27;/gi, "'");
        text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

        // 5. Remove footer / signature sections (everything after these markers)
        const footerMarkers = [
            /^[-_=]{3,}/m,                              // --- or === separator lines
            /^unsubscribe/im,
            /^manage\s+(?:your\s+)?(?:email\s+)?preferences/im,
            /^this\s+(?:email|message)\s+was\s+sent\s+(?:to|by)/im,
            /^privacy\s+policy/im,
            /^view\s+(?:this\s+)?(?:email\s+)?in\s+(?:your\s+)?browser/im,
            /^if\s+you\s+no\s+longer\s+wish/im,
            /^to\s+stop\s+receiving\s+these\s+emails/im,
            /^sent\s+from\s+my\s+iphone/im,
            /^get\s+outlook\s+for/im,
        ];

        for (const marker of footerMarkers) {
            const match = text.match(marker);
            if (match && match.index !== undefined) {
                text = text.substring(0, match.index);
            }
        }

        // 6. Normalize whitespace
        text = text.replace(/[ \t]+/g, ' ');         // collapse horizontal whitespace
        text = text.replace(/\n{3,}/g, '\n\n');       // max 2 consecutive newlines
        text = text.trim();

        return text;
    }
};

module.exports = EmailCleaner;
