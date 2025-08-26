// Keep-alive script for free hosting platforms
// This prevents the app from sleeping by pinging itself every 14 minutes

const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.PORT || 3000}`;

function keepAlive() {
    if (process.env.NODE_ENV === 'production' && SELF_URL.includes('http')) {
        setInterval(() => {
            try {
                const https = require(SELF_URL.startsWith('https') ? 'https' : 'http');
                https.get(SELF_URL, (res) => {
                    console.log(`Keep-alive ping: ${res.statusCode}`);
                }).on('error', (err) => {
                    console.log('Keep-alive ping failed:', err.message);
                });
            } catch (error) {
                console.log('Keep-alive error:', error.message);
            }
        }, PING_INTERVAL);
        
        console.log('Keep-alive service started - pinging every 14 minutes');
    }
}

module.exports = keepAlive;
