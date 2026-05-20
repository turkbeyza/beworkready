const Search = require('../models/Search');

/**
 * GET /api/v1/history  (requires x-user-uid header)
 */
async function getHistory(req, res) {
  const userId = req.headers['x-user-uid'];
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const history = await Search.find({ userId })
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();

  res.json({ success: true, data: history });
}

/**
 * DELETE /api/v1/history  (clear all)
 */
async function clearHistory(req, res) {
  const userId = req.headers['x-user-uid'];
  await Search.deleteMany({ userId });
  res.json({ success: true, message: 'Search history cleared.' });
}

/**
 * DELETE /api/v1/history/:id  (delete single item)
 */
async function deleteHistoryItem(req, res) {
  const userId = req.headers['x-user-uid'];
  const { id } = req.params;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  await Search.deleteOne({ _id: id, userId });
  res.json({ success: true, message: 'Search history item deleted.' });
}

module.exports = { getHistory, clearHistory, deleteHistoryItem };
