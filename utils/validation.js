/**
 * Simple Validation Utility for Backend Controllers
 */

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

const validateRequired = (fields, body) => {
    const missing = [];
    fields.forEach(field => {
        if (!body[field] || body[field].toString().trim() === '') {
            missing.push(field);
        }
    });
    return missing;
};

module.exports = {
    validateEmail,
    validateRequired
};
