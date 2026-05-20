const Subscription = require('../models/Subscription');

module.exports = async (req, res) => {
  const email = req.headers['x-user-email'];
  if (!email) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const alerts = await Subscription.find({ email }).sort({ timestamp: -1 });
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
