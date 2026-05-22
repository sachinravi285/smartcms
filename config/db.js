const mongoose = require('mongoose');

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }

    try {
        // Force Google DNS for DB connection stability
        const dns = require('dns');
        if (process.env.NODE_ENV !== 'production') {
            dns.setServers(['8.8.8.8', '8.8.4.4']);
        }

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // 10s timeout
            socketTimeoutMS: 45000,
        });

        console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ DATABASE ERROR: ${error.message}`);
        // In development, we want to know if it's a DNS issue
        if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEOUT')) {
            console.error('👉 Suggestion: Check your internet connection or IP Whitelist in MongoDB Atlas.');
        }
        throw error;
    }
};

module.exports = connectDB;