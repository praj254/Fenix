const twilio = require('twilio');

class SmsService {
    constructor() {
        try {
            this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
            this.isConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
        } catch (err) {
            this.isConfigured = false;
            console.warn("Twilio failed to initialize. SMS will be disabled:", err.message);
        }
    }

    async sendOTP(to, code) {
        if (!this.isConfigured) {
            console.warn(`[SMS MOCK] To: ${to} | Code: ${code} - Twilio credentials missing in .env`);
            return false; // Return false so controller knows it simulated it
        }

        // Twilio requires E.164 formatting (+[CountryCode][Number])
        // If the number doesn't start with '+', prepend the default country code (e.g. +91 for India)
        let formattedTo = to.trim();
        if (!formattedTo.startsWith('+')) {
            formattedTo = '+91' + formattedTo.replace(/\D/g, ''); // Default +91, remove non-digits
        } else {
            // Just clean up whitespace or weird chars but keep the plus
            formattedTo = '+' + formattedTo.replace(/\D/g, '');
        }

        try {
            const message = await this.client.messages.create({
                body: `Your Fenix verification code is: ${code}. It expires in 10 minutes.`,
                from: this.fromNumber,
                to: formattedTo
            });
            console.log(`[SMS SENT] SID: ${message.sid} to ${formattedTo}`);
            return true;
        } catch (err) {
            console.error(`[SMS ERROR] Failed to send SMS to ${to}:`, err.message);
            throw err;
        }
    }
}

module.exports = new SmsService();
