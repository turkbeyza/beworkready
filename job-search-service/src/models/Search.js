const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  query:     { type: String, default: '' },
  city:      { type: String },
  country:   { type: String },
  town:      { type: String },
  workingType: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// TTL: auto-delete search history older than 90 days
searchSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('Search', searchSchema);
