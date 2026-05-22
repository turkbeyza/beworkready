const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  email:        { type: String, required: true },
  user_uid:     { type: String, default: '' },   // Firebase UID for identifying the user
  city:         { type: String, default: '' },    // empty = any city
  country:      { type: String, default: '' },    // empty = any country
  working_type: { type: String, default: '' },    // empty = any type
  keyword:      { type: String, default: '' },    // empty = any job title
  salary_min:   { type: Number, default: 0 },     // 0 = no min
  is_active:    { type: Boolean, default: true }, // false = notifications paused
  timestamp:    { type: Date, default: Date.now },
});

// Compound index to prevent duplicate subscriptions per user+keyword combo
subscriptionSchema.index({ email: 1, keyword: 1, city: 1, working_type: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
