const twilio = require('twilio');

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { phone, otp, name } = req.body;

    if (!phone || !otp || !name) {
        return res.status(400).json({ success: false, error: 'Missing phone, name or OTP parameters' });
    }

    // Safety check for Private API Keys configured on Vercel
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
        // Return a graceful failure so the frontend knows keys are missing
        return res.status(500).json({ 
            success: false, 
            error: 'MISSING_KEYS',
            message: 'Server missing Twilio Configurations.'
        });
    }

    const client = twilio(accountSid, authToken);

    try {
        const message = await client.messages.create({
            body: `RecallX Authentication\nHello Agent ${name},\nYour Security OTP is: ${otp}`,
            from: fromPhone,
            to: phone
        });

        return res.status(200).json({ 
            success: true, 
            messageSid: message.sid 
        });

    } catch (error) {
        console.error("Twilio SMS Error: ", error);
        return res.status(500).json({ 
            success: false, 
            error: 'TWILIO_ERROR',
            message: error.message 
        });
    }
}
