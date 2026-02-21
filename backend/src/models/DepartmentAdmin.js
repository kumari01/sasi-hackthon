const mongoose = require('mongoose');

const DepartmentAdminSchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model('DepartmentAdmin', DepartmentAdminSchema);
