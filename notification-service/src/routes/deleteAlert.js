const Subscription = require('../models/Subscription');

module.exports = async (req, res) => {
  const email = req.headers['x-user-email'];
  const { id } = req.params;
  if (!email) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const deleted = await Subscription.findOneAndDelete({ _id: id, email });
    if (!deleted) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
