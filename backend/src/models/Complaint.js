const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model('Complaint', ComplaintSchema);
