const Subscription = require('../models/Subscription');

// POST /api/v1/notifications/subscribe
// Body: { email, city, working_type, keyword, salary_min }
// Stores user preference for job alerts
module.exports = async (req, res) => {
  const { email, city, working_type, keyword, salary_min } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'email is required' });
  
  try {
    await Subscription.create({ 
      email, 
      city: city || '', 
      working_type: working_type || '', 
      keyword: keyword || '',
      salary_min: salary_min ? Number(salary_min) : 0
    });
    res.json({ success: true, message: `Successfully subscribed to job alerts!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
