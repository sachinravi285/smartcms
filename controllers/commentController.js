const Comment = require('../models/Comment');
const Complaint = require('../models/Complaint');

// @desc Add comment to complaint
// @route POST /api/complaints/:id/comments
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const comment = await Comment.create({
            complaint: req.params.id,
            user: req.user ? req.user._id : null,
            text
        });

        // Notify relevant parties via Email
        const complaint = await Complaint.findById(req.params.id).populate('user');
        const sendEmail = require('../utils/sendEmail');
        const Settings = require('../models/Settings');
        const systemSettings = await Settings.findOne();

        if (complaint) {
            // If user comments, notify admin (Background Process)
            if (req.user.role === 'user' && systemSettings && systemSettings.contactEmail) {
                sendEmail({
                    email: systemSettings.contactEmail,
                    subject: `New Comment on Complaint ${complaint.trackingId}`,
                    html: `<p><b>${req.user.name}</b> added a comment to complaint <b>${complaint.trackingId}</b>:</p>
                           <blockquote>${text}</blockquote>`
                });
            }
            // If admin comments, notify user (Background Process)
            else if (req.user.role !== 'user') {
                sendEmail({
                    email: complaint.user.email,
                    subject: `New Update on your Complaint ${complaint.trackingId}`,
                    html: `<p>An administrator has added a comment to your complaint <b>${complaint.trackingId}</b>:</p>
                           <blockquote>${text}</blockquote>
                           <p>Please check your dashboard for details.</p>`
                });
            }
        }

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Get comments for a complaint
// @route GET /api/complaints/:id/comments
exports.getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ complaint: req.params.id })
            .populate('user', 'name role')
            .sort('-createdAt');
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
