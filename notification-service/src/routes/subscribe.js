const Subscription = require('../models/Subscription');

// POST /api/v1/notifications/subscribe
// Body: { email, city, working_type, keyword, salary_min, country }
// Stores user preference for job alerts (upsert based on email+keyword+city+working_type)
module.exports = async (req, res) => {
  const { email, city, country, working_type, keyword, salary_min } = req.body;
  const user_uid = req.headers['x-user-uid'] || '';
  if (!email) return res.status(400).json({ success: false, message: 'email is required' });

  try {
    // Check for duplicate alert with same filters
    const existing = await Subscription.findOne({
      email,
      keyword: keyword || '',
      city: city || '',
      working_type: working_type || '',
    });

    if (existing) {
      // Re-activate if it was paused, otherwise return duplicate info
      if (!existing.is_active) {
        existing.is_active = true;
        await existing.save();
        return res.json({ success: true, message: 'Job alert re-activated!' });
      }
      return res.json({ success: true, message: 'A similar alert already exists.' });
    }

    await Subscription.create({
      email,
      user_uid,
      city: city || '',
      country: country || '',
      working_type: working_type || '',
      keyword: keyword || '',
      salary_min: salary_min ? Number(salary_min) : 0,
      is_active: true,
    });
    res.json({ success: true, message: 'Successfully subscribed to job alerts!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
