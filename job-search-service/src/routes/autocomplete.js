const router = require('express').Router();
const { autocomplete } = require('../controllers/autocompleteController');
router.get('/', autocomplete);
module.exports = router;
