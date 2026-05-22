const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { listJobs, getJob, createJob, updateJob, getJobsByCity, getMyPostedJobs, deleteJob, saveJob, unsaveJob, getSavedJobs } = require('../controllers/jobController');
const auth = require('../middleware/auth');

const validateJob = [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('working_type').isIn(['fulltime','parttime','remote','hybrid','contract']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
    next();
  },
];

router.get('/',           listJobs);
router.get('/company/me', auth, getMyPostedJobs);
router.get('/city/:city', getJobsByCity);
router.get('/saved/all',  auth, getSavedJobs);
router.get('/:id',        getJob);
router.post('/',          auth, validateJob, createJob);
router.put('/:id',        auth, updateJob);
router.delete('/:id',     auth, deleteJob);
router.post('/:id/save',  auth, saveJob);
router.delete('/:id/unsave', auth, unsaveJob);

module.exports = router;
