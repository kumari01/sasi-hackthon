const mongoose = require('mongoose');

const OTPVerificationSchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model('OTPVerification', OTPVerificationSchema);
