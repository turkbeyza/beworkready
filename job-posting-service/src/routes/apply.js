const router = require('express').Router();
const { applyToJob } = require('../controllers/applyController');
const auth = require('../middleware/auth');

router.post('/', auth, applyToJob);

module.exports = router;
