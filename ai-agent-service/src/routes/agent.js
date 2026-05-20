const router = require('express').Router();
const { chat } = require('../controllers/agentController');
router.post('/chat', chat);
module.exports = router;
