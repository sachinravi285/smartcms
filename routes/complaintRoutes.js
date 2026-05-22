const express = require('express');
const router = express.Router();
const { createComplaint, getMyComplaints, trackComplaint, reopenComplaint } = require('../controllers/complaintController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');
const { addComment, getComments } = require('../controllers/commentController');

// router.use(protect); // Remove global protection

router.post('/', upload.array('attachments', 5), (req, res, next) => {
    // Optional protection: if token exists, use protect, else continue as guest
    if (req.headers.authorization) {
        return protect(req, res, next);
    }
    next();
}, createComplaint);

router.get('/my', protect, getMyComplaints);
router.get('/track/:trackingId', trackComplaint);
router.put('/:id/reopen', protect, reopenComplaint);

router.route('/:id/comments')
    .get(getComments)
    .post(protect, addComment);

module.exports = router;
