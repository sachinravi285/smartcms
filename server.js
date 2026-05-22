require('dotenv').config();
const express = require('express');
const dns = require('dns');

// Force Google DNS to bypass ISP/Local DNS timeouts (ETIMEOUT) ONLY in local development
if (process.env.NODE_ENV !== 'production') {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
}
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

// Connect to Database
connectDB().then(() => {
    console.log(`✅ DB Initialized (${isVercel ? 'Cloud/Vercel' : 'Local'})`);
    if (!process.env.JWT_SECRET) console.error('🔴 WARNING: JWT_SECRET is missing!');
}).catch(err => {
    console.error('❌ DB Initialized Failed:', err.message);
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, 
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Routes
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// SPA Catch-all: Hand over all other routes to the frontend
app.get(['/', '/admin', '/register', '/track'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback for any other non-API routes
app.get('*splat', (req, res, next) => {
    // If it's an API request that didn't match any route, return 404 JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: `API endpoint ${req.path} not found` });
    }
    
    // Otherwise, serve index.html (SPA support)
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    console.error(`❌ ERROR [${req.method}] ${req.path} >> Status: ${status} >> Message: ${err.message}`);
    
    // Log stack trace for debugging
    console.error('STACK:', err.stack);

    res.status(status).json({
        message: err.message || 'Something went wrong on the server',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Deployment setup
const PORT = process.env.PORT || 5000;
const server = require('http').createServer(app);
const ioManager = require('./socket');
ioManager.init(server);

if (require.main === module || !isVercel) {
    server.listen(PORT, () => {
        console.log(`🚀 SmartCMS: Running locally on http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
