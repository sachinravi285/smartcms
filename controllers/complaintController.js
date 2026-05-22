const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');
const generateTrackingId = require('../utils/generateTrackingId');
const sendEmail = require('../utils/sendEmail');
const Settings = require('../models/Settings');
const { validateRequired, validateEmail } = require('../utils/validation');
const classifyComplaint = require('../utils/aiClassifier');

// @desc Create new complaint
// @route POST /api/complaints
exports.createComplaint = async (req, res) => {
    console.log('📬 Received New Complaint Request');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Files:', req.files ? req.files.length : 'none');
    console.log('User:', req.user ? req.user.email : 'Guest');

    const { title, description, category, priority, guestEmail, guestName } = req.body;

    try {
        // Validation
        const missing = validateRequired(['title', 'description', 'category'], req.body);
        if (missing.length > 0) {
            return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
        }

        if (!req.user && (!guestEmail || !validateEmail(guestEmail))) {
            return res.status(400).json({ message: 'Valid guest email is required for ghost submissions' });
        }

        const trackingId = generateTrackingId();
        const systemSettings = await Settings.findOne();

        let attachments = [];
        if (req.files) {
            attachments = req.files.map(file => ({
                url: file.path,
                publicId: file.filename,
                format: file.mimetype.split('/')[1]
            }));
        }

        const complaintData = {
            trackingId,
            title,
            description,
            category,
            priority: priority || 'Medium',
            attachments,
            timeline: [{
                status: 'Pending',
                description: 'Complaint submitted successfully',
                updatedBy: req.user ? req.user._id : null
            }]
        };

        // --- AI Classification (Smart Routing) ---
        const aiResult = await classifyComplaint(title, description);
        if (aiResult) {
            console.log('🤖 AI Classified:', aiResult);
            complaintData.category = aiResult.category || complaintData.category;
            complaintData.priority = aiResult.priority || complaintData.priority;
            complaintData.department = aiResult.departmentId || null;
            
            if (aiResult.departmentId) {
                complaintData.timeline[0].description += ` (Auto-assigned to Department via AI)`;
            }
        } 
        
        // Fallback: If department is still null, try to match category name to a Department name
        if (!complaintData.department) {
            const matchedDept = await require('../models/Department').findOne({ 
                name: { $regex: new RegExp(`^${complaintData.category}$`, 'i') } 
            });
            if (matchedDept) {
                complaintData.department = matchedDept._id;
                console.log(`📍 Auto-linked to Department: ${matchedDept.name} via Category Match`);
            }
        }
        // ----------------------------------------

        if (req.user) {
            complaintData.user = req.user._id;
        } else {
            complaintData.guestName = guestName;
            complaintData.guestEmail = guestEmail;
        }

        const complaint = await Complaint.create(complaintData);

        // Notify user via DB notification
        if (req.user) {
            const notif = await Notification.create({
                user: req.user._id,
                message: `Your complaint with tracking ID ${trackingId} has been submitted.`,
                complaintId: complaint._id
            });

            // Emit real-time socket notification
            const ioManager = require('../socket');
            ioManager.sendNotification(req.user._id, {
                _id: notif._id,
                message: notif.message,
                complaintId: complaint._id,
                createdAt: notif.createdAt
            });
        }

        // Send Email (Safe Async - Don't block response)
        const recipientEmail = req.user ? req.user.email : guestEmail;
        const recipientName = req.user ? req.user.name : guestName;

        if (recipientEmail) {
            sendEmail({
                email: recipientEmail,
                subject: `Complaint Submitted - [${trackingId}]`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; border-radius: 10px; border: 1px solid #e2e8f0; padding: 20px;">
                        <h2 style="color: #4f46e5;">Success! Complaint Received</h2>
                        <p>Hello <b>${recipientName || 'Valued Citizen'}</b>,</p>
                        <p>Your complaint has been successfully registered in the <b>${systemSettings?.appName || 'Smart Complaint System'}</b>.</p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; font-size: 0.9rem; color: #64748b;">YOUR TRACKING ID</p>
                            <h1 style="margin: 5px 0; color: #1e293b; letter-spacing: 2px;">${trackingId}</h1>
                        </div>
                        <p>You can use this ID to track the progress of your complaint.</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="font-size: 0.8rem; color: #94a3b8;">This is an automated notification.</p>
                    </div>
                `
            }).catch(err => console.error('Email Fail:', err.message));
        }

        // Notify Admin (Safe Async)
        if (systemSettings && systemSettings.contactEmail) {
            sendEmail({
                email: systemSettings.contactEmail,
                subject: `NEW ALERT: New Complaint Filed (${trackingId})`,
                html: `<h3>New Complaint Received</h3><p><b>ID:</b> ${trackingId}</p><p><b>Title:</b> ${title}</p>`
            }).catch(err => console.error('Admin Email Fail:', err.message));

            // Emit real-time notification for Admins
            const ioManager = require('../socket');
            
            // Create persistent notifications for all admins
            const admins = await User.find({ role: { $in: ['admin', 'super-admin'] } });
            for (const admin of admins) {
                await Notification.create({
                    user: admin._id,
                    message: `New complaint filed: ${title} (${trackingId})`,
                    complaintId: complaint._id
                });
            }

            ioManager.emitToAdmins({
                message: `New complaint filed: ${title}`,
                trackingId,
                type: 'new_complaint'
            });
        }

        res.status(201).json(complaint);
    } catch (error) {
        console.error('Create Complaint Error:', error);
        res.status(500).json({ message: 'Failed to create complaint', error: error.message });
    }
};

// @desc Get user complaints
// @route GET /api/complaints/my
exports.getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Get complaint by tracking ID
// @route GET /api/complaints/track/:trackingId
exports.trackComplaint = async (req, res) => {
    console.log(`🔍 Tracking Request: ${req.params.trackingId}`);
    try {
        const complaint = await Complaint.findOne({ trackingId: req.params.trackingId })
            .populate('user', 'name email role')
            .populate('timeline.updatedBy', 'name role');

        if (!complaint) {
            console.log(`⚠️ Tracking ID not found: ${req.params.trackingId}`);
            return res.status(404).json({ message: 'Complaint not found' });
        }

        console.log(`✅ Tracking data found for: ${req.params.trackingId}`);
        res.json(complaint);
    } catch (error) {
        console.error(`❌ Tracking GET Error (${req.params.trackingId}):`, error.message);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
};

// @desc Reopen complaint
// @route PUT /api/complaints/:id/reopen
exports.reopenComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        if (complaint.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        complaint.status = 'Pending';
        complaint.timeline.push({
            status: 'Pending',
            description: 'Complaint reopened by user',
            updatedBy: req.user._id
        });

        await complaint.save();

        // Notify Admin
        const systemSettings = await Settings.findOne();
        if (systemSettings && systemSettings.contactEmail) {
            await sendEmail({
                email: systemSettings.contactEmail,
                subject: `Complaint Reopened: ${complaint.trackingId}`,
                html: `<p>User <b>${req.user.name}</b> has reopened complaint <b>${complaint.trackingId}</b>.</p>
                       <p>Please review the complaint in the management panel.</p>`
            });
        }

        res.json(complaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
