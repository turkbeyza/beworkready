const router = require('express').Router();
const { getHistory, clearHistory, deleteHistoryItem } = require('../controllers/historyController');
router.get('/',    getHistory);
router.delete('/', clearHistory);
router.delete('/:id', deleteHistoryItem);
module.exports = router;
