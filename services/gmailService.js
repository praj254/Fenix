const Imap = require('imap');

/**
 * Gmail IMAP Service
 * Connects to Gmail via IMAP and fetches unseen emails.
 */

function getImapConfig() {
    const user = process.env.GMAIL_USER;
    const password = process.env.GMAIL_PASS;
    const host = process.env.GMAIL_HOST || 'imap.gmail.com';
    const port = parseInt(process.env.GMAIL_PORT || '993', 10);

    if (!user || !password) {
        throw new Error('GMAIL_USER and GMAIL_PASS must be set in .env for IMAP access.');
    }

    return { user, password, host, port, tls: true, tlsOptions: { rejectUnauthorized: false } };
}

/**
 * Parse email address from a structured IMAP address object
 */
function parseAddress(addressArray) {
    if (!addressArray || !addressArray.length) return { name: '', email: '' };
    const addr = addressArray[0];
    return {
        name: addr.name || '',
        email: `${addr.mailbox || ''}@${addr.host || ''}`
    };
}

/**
 * Fetch all UNSEEN emails from the inbox.
 * Returns an array of { subject, from, fromEmail, date, body }
 * Marks fetched emails as SEEN so they are not re-processed.
 */
function fetchUnseenEmails() {
    return new Promise((resolve, reject) => {
        let config;
        try {
            config = getImapConfig();
        } catch (err) {
            return reject(err);
        }

        const imap = new Imap(config);
        const emails = [];

        imap.once('ready', () => {
            imap.openBox('INBOX', false, (err) => {
                if (err) { imap.end(); return reject(err); }

                imap.search(['UNSEEN'], (err, uids) => {
                    if (err) { imap.end(); return reject(err); }
                    if (!uids || uids.length === 0) {
                        imap.end();
                        return resolve([]);
                    }

                    const fetch = imap.fetch(uids, {
                        bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
                        struct: true,
                        markSeen: true
                    });

                    fetch.on('message', (msg) => {
                        const email = { subject: '', from: '', fromEmail: '', date: null, body: '' };

                        msg.on('body', (stream, info) => {
                            let buffer = '';
                            stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
                            stream.on('end', () => {
                                if (info.which === 'TEXT') {
                                    email.body = buffer;
                                } else {
                                    // Parse headers
                                    const headers = Imap.parseHeader(buffer);
                                    email.subject = (headers.subject && headers.subject[0]) || '';
                                    email.date = (headers.date && headers.date[0]) ? new Date(headers.date[0]) : new Date();

                                    const fromRaw = (headers.from && headers.from[0]) || '';
                                    // Extract name and email from "Name <email>" format
                                    const match = fromRaw.match(/^(?:"?([^"]*)"?\s)?<?([^\s>]+@[^\s>]+)>?$/);
                                    if (match) {
                                        email.from = match[1] || '';
                                        email.fromEmail = match[2] || fromRaw;
                                    } else {
                                        email.from = fromRaw;
                                        email.fromEmail = fromRaw;
                                    }
                                }
                            });
                        });

                        msg.once('end', () => {
                            emails.push(email);
                        });
                    });

                    fetch.once('error', (err) => {
                        imap.end();
                        reject(err);
                    });

                    fetch.once('end', () => {
                        imap.end();
                    });
                });
            });
        });

        imap.once('error', (err) => {
            reject(err);
        });

        imap.once('end', () => {
            resolve(emails);
        });

        imap.connect();
    });
}

/**
 * Fetch all emails from the last N days from the inbox.
 * Returns an array of { subject, from, fromEmail, date, body }
 * Does NOT mark fetched emails as SEEN.
 * @param {number} days - The number of days to look back (default: 7).
 */
function fetchRecentEmails(days = 7) {
    return new Promise((resolve, reject) => {
        let config;
        try {
            config = getImapConfig();
        } catch (err) {
            return reject(err);
        }

        const imap = new Imap(config);
        const emails = [];

        imap.once('ready', () => {
            imap.openBox('INBOX', false, (err) => {
                if (err) { imap.end(); return reject(err); }

                const sinceDate = new Date();
                sinceDate.setDate(sinceDate.getDate() - days);

                imap.search([['SINCE', sinceDate]], (err, uids) => {
                    if (err) { imap.end(); return reject(err); }
                    if (!uids || uids.length === 0) {
                        imap.end();
                        return resolve([]);
                    }

                    const fetch = imap.fetch(uids, {
                        bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
                        struct: true,
                        markSeen: false // Do not mark as seen
                    });

                    fetch.on('message', (msg) => {
                        const email = { subject: '', from: '', fromEmail: '', date: null, body: '' };

                        msg.on('body', (stream, info) => {
                            let buffer = '';
                            stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
                            stream.on('end', () => {
                                if (info.which === 'TEXT') {
                                    email.body = buffer;
                                } else {
                                    // Parse headers
                                    const headers = Imap.parseHeader(buffer);
                                    email.subject = (headers.subject && headers.subject[0]) || '';
                                    email.date = (headers.date && headers.date[0]) ? new Date(headers.date[0]) : new Date();

                                    const fromRaw = (headers.from && headers.from[0]) || '';
                                    // Extract name and email from "Name <email>" format
                                    const match = fromRaw.match(/^(?:"?([^"]*)"?\s)?<?([^\s>]+@[^\s>]+)>?$/);
                                    if (match) {
                                        email.from = match[1] || '';
                                        email.fromEmail = match[2] || fromRaw;
                                    } else {
                                        email.from = fromRaw;
                                        email.fromEmail = fromRaw;
                                    }
                                }
                            });
                        });

                        msg.once('end', () => {
                            emails.push(email);
                        });
                    });

                    fetch.once('error', (err) => {
                        imap.end();
                        reject(err);
                    });

                    fetch.once('end', () => {
                        imap.end();
                    });
                });
            });
        });

        imap.once('error', (err) => {
            reject(err);
        });

        imap.once('end', () => {
            resolve(emails);
        });

        imap.connect();
    });
}

const GmailService = {
    fetchUnseenEmails,
    fetchRecentEmails
};

module.exports = GmailService;
