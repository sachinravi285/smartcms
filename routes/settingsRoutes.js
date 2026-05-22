const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getPublicSettings, getPublicDepartments } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/public', getPublicSettings);
router.get('/departments', getPublicDepartments);

router.route('/')
    .get(protect, authorize('admin', 'super-admin'), getSettings)
    .put(protect, authorize('super-admin'), updateSettings);

module.exports = router;
