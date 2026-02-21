const mongoose = require('mongoose');

module.exports = {
  connect: (uri) => mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }),
};
