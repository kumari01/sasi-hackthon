const mongoose = require('mongoose');

const SuperAdminSchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model('SuperAdmin', SuperAdminSchema);
