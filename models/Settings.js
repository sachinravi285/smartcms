const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    appName: {
        type: String,
        default: 'SmartCMS'
    },
    contactEmail: {
        type: String,
        default: 'admin@system.com'
    },
    allowRegistration: {
        type: Boolean,
        default: true
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    smtpHost: { type: String, default: '' },
    smtpPort: { type: String, default: '587' },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' },
    smtpFrom: { type: String, default: '' },
    smtpEncryption: {
        type: String,
        enum: ['ssl', 'tls', 'starttls', 'none'],
        default: 'tls'
    }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
