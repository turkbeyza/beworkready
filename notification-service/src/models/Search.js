const mongoose = require('mongoose');
const searchSchema = new mongoose.Schema({
  userId:      { type: String, required: true, index: true },
  userEmail:   { type: String, default: '' }, // stored for notification emails
  query:       { type: String },
  city:        { type: String },
  workingType: { type: String },
  timestamp:   { type: Date, default: Date.now },
});
module.exports = mongoose.model('Search', searchSchema);
