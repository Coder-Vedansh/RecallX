const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { email, otp, name } = req.body;

    if (!email || !otp || !name) {
        return res.status(400).json({ success: false, error: 'Missing email, name or OTP parameters' });
    }

    // Safety check for Environment Variables
    const gmailAccount = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailAccount || !gmailAppPassword) {
        return res.status(500).json({ 
            success: false, 
            error: 'MISSING_KEYS',
            message: 'Server missing Gmail Configuration.'
        });
    }

    // Initialize the Nodemailer transport pointing directly at Google's SMTP servers
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailAccount,
            pass: gmailAppPassword
        }
    });

    // Construct the actual message sent to the player
    const mailOptions = {
        from: `"RecallX System" <${gmailAccount}>`,
        to: email,
        subject: `RecallX Verification Code: ${otp}`,
        text: `Welcome, Agent ${name}.\n\nYour secure authentication code to enter RecallX Pro is: ${otp}\n\nGood luck!`,
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 10px;">
                <h1 style="color: #a78bfa;">RecallX Pro Access</h1>
                <p>Welcome back, <strong>Agent ${name}</strong>.</p>
                <p>Your highly secure verification code is:</p>
                <h2 style="background: #1e293b; padding: 15px; border-radius: 8px; letter-spacing: 5px; color: #6ee7b7; display:inline-block;">${otp}</h2>
                <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 30px;">Do not share this code. Return to the browser and input it safely.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);

        return res.status(200).json({ 
            success: true, 
            message: 'Email securely dispatched.' 
        });

    } catch (error) {
        console.error("Nodemailer Error: ", error);
        return res.status(500).json({ 
            success: false, 
            error: 'TRANSPORT_ERROR',
            message: error.message 
        });
    }
}
