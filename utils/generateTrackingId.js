const generateTrackingId = () => {
    const prefix = 'CMP';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${timestamp}-${random}`;
};

module.exports = generateTrackingId;
