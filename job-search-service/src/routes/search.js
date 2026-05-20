const router = require('express').Router();
const { searchJobs } = require('../controllers/searchController');
router.get('/', searchJobs);
module.exports = router;
