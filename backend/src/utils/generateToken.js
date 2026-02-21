const jwt = require('jsonwebtoken');

module.exports = (payload) => jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
