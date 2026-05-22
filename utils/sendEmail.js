const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');
const dns = require('dns').promises;

// Set global DNS servers for this process as a backup
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const sendEmail = async (options) => {
    try {
        // Fetch dynamic settings
        let settings = await Settings.findOne();

        let transporter;
        let smtpConfig = {};

        // Check if dynamic SMTP is configured
        if (settings && settings.smtpHost && settings.smtpUser && settings.smtpPass) {
            const isGmail = settings.smtpHost.toLowerCase().includes('gmail.com');

            // Strategy: If gmail, use the specialized service which handles resolution better
            if (isGmail) {
                smtpConfig = {
                    service: 'gmail',
                    auth: {
                        user: settings.smtpUser,
                        pass: settings.smtpPass,
                    },
                    // Increase timeouts for unstable networks
                    connectionTimeout: 15000,
                    greetingTimeout: 15000,
                    socketTimeout: 20000
                };
            } else {
                smtpConfig = {
                    host: settings.smtpHost,
                    port: settings.smtpPort || 587,
                    secure: settings.smtpEncryption === 'ssl',
                    auth: {
                        user: settings.smtpUser,
                        pass: settings.smtpPass,
                    },
                    tls: {
                        rejectUnauthorized: false
                    },
                    connectionTimeout: 10000,
                    greetingTimeout: 10000,
                    socketTimeout: 15000
                };
            }

            transporter = nodemailer.createTransport(smtpConfig);

            const mailOptions = {
                from: `${settings?.appName || 'Smart Complaint System'} <${settings?.smtpFrom || settings?.smtpUser}>`,
                to: options.email,
                subject: options.subject,
                html: options.html,
            };

            // Non-blocking send (we don't await the actual delivery result here normally, 
            // but since this utility might be awaited by its caller, we wrap it)
            return await transporter.sendMail(mailOptions);
        }

        // Fallback to Env variables
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `Smart Complaint System <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            html: options.html,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        // Detailed error logging for debugging while keeping the app stable
        if (error.code === 'EDNS' || error.message.includes('ETIMEOUT')) {
            console.error(`⚠️ Email Network Error: DNS/Connection Timeout for ${options.email}. Please check your internet or ISP settings.`);
        } else {
            console.error('❌ Email sending failed:', error.message);
        }
    }
};

module.exports = sendEmail;
