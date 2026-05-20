const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  city: { type: String, default: '' },
  country: { type: String, default: '' },
  working_type: { type: String, default: '' },
  keyword: { type: String, default: '' },
  salary_min: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
