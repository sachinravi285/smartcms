const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const ExcelJS = require('exceljs');

// @desc Get all complaints (admin only)
// @route GET /api/admin/complaints
exports.getAllComplaints = async (req, res) => {
    try {
        const { category, priority, status, search } = req.query;
        let query = {};

        if (category) query.category = category;
        if (priority) query.priority = priority;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { trackingId: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } }
            ];
        }

        // --- Role & Department Scope ---
        if (req.user.role === 'staff' || req.user.role === 'dept-admin') {
            if (!req.user.department) {
                console.warn(`⚠️ Limited user ${req.user.email} has no department assigned.`);
                return res.json([]); 
            }
            query.department = req.user.department;
        }
        // Admin and Super-Admin see all by default
        // ------------------------------------

        const complaints = await Complaint.find(query)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Update complaint status
// @route PUT /api/admin/complaints/:id/status
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { status, description } = req.body;
        const complaint = await Complaint.findById(req.params.id).populate('user');

        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        // --- Security Check ---
        if (req.user.role === 'staff' || req.user.role === 'dept-admin') {
            if (!req.user.department || (complaint.department && complaint.department.toString() !== req.user.department.toString())) {
                return res.status(403).json({ message: 'Access denied: You can only update complaints within your department' });
            }
        }
        // ----------------------

        complaint.status = status;
        complaint.timeline.push({
            status,
            description: description || `Status updated to ${status}`,
            updatedBy: req.user._id
        });

        await complaint.save();

        // Notify user
        if (complaint.user || complaint.guestEmail) {
            const recipientEmail = complaint.user ? complaint.user.email : complaint.guestEmail;

            if (complaint.user) {
                const notif = await Notification.create({
                    user: complaint.user._id,
                    message: `Your complaint status has been updated to ${status}.`,
                    complaintId: complaint._id
                });

                // Emit real-time socket notification
                const ioManager = require('../socket');
                ioManager.sendNotification(complaint.user._id, {
                    _id: notif._id,
                    message: notif.message,
                    complaintId: complaint._id,
                    createdAt: notif.createdAt
                });
            }

            // Email notification
            sendEmail({
                email: recipientEmail,
                subject: 'Complaint Status Updated',
                html: `<p>Your complaint status is now: <b>${status}</b></p>`
            });
        }

        res.json(complaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Admin Analytics
// @route GET /api/admin/analytics
exports.getAnalytics = async (req, res) => {
    try {
        let query = {};
        
        // --- Role & Department Scope ---
        if (req.user.role === 'staff' || req.user.role === 'dept-admin') {
            if (!req.user.department) {
                return res.json({ total: 0, pending: 0, resolved: 0, categoryData: [], priorityData: [], monthlyData: [] });
            }
            query.department = req.user.department;
        }
        // ------------------------------------

        const total = await Complaint.countDocuments(query);
        const pending = await Complaint.countDocuments({ ...query, status: 'Pending' });
        const resolved = await Complaint.countDocuments({ ...query, status: 'Resolved' });

        const categoryData = await Complaint.aggregate([
            { $match: query },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const priorityData = await Complaint.aggregate([
            { $match: query },
            { $group: { _id: "$priority", count: { $sum: 1 } } }
        ]);

        const monthlyData = await Complaint.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.json({ total, pending, resolved, categoryData, priorityData, monthlyData });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Export to Excel
// @route GET /api/admin/export
exports.exportToExcel = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'staff' || req.user.role === 'dept-admin') {
            if (!req.user.department) return res.status(403).json({ message: 'No department assigned' });
            query.department = req.user.department;
        }
        const complaints = await Complaint.find(query).populate('user', 'name email');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Complaints');

        worksheet.columns = [
            { header: 'Tracking ID', key: 'trackingId', width: 20 },
            { header: 'User', key: 'userName', width: 20 },
            { header: 'Email', key: 'userEmail', width: 20 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Priority', key: 'priority', width: 10 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Date', key: 'createdAt', width: 20 },
        ];

        complaints.forEach(c => {
            worksheet.addRow({
                trackingId: c.trackingId,
                userName: c.user ? c.user.name : (c.guestName || 'Guest'),
                userEmail: c.user ? c.user.email : (c.guestEmail || 'N/A'),
                title: c.title,
                category: c.category,
                priority: c.priority,
                status: c.status,
                createdAt: c.createdAt.toDateString()
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=complaints.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Get single complaint details
// @route GET /api/admin/complaints/:id
exports.getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email')
            .populate('department', 'name')
            .populate('timeline.updatedBy', 'name role');

        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        // --- Role & Department Scope Check ---
        const userDeptId = req.user.department ? req.user.department.toString() : null;
        const complaintDeptId = (complaint.department && complaint.department._id) ? complaint.department._id.toString() : null;

        if ((req.user.role === 'staff' || req.user.role === 'dept-admin')) {
            if (!userDeptId || (complaintDeptId && complaintDeptId !== userDeptId)) {
                return res.status(403).json({ message: 'Access denied: This complaint belongs to another department or you have no department assigned' });
            }
        }
        // -----------------------------------------

        res.json(complaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Assign complaint to department/staff
// @route PUT /api/admin/complaints/:id/assign
exports.assignComplaint = async (req, res) => {
    try {
        const { departmentId, staffId, note } = req.body;
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        if (departmentId) {
            // Check permissions for dept-admin
            if (req.user.role === 'dept-admin' && req.user.department && departmentId !== req.user.department.toString()) {
                return res.status(403).json({ message: 'You can only assign within your own department' });
            }
            complaint.department = departmentId;
        }

        if (staffId) {
            const staff = await User.findById(staffId);
            if (!staff) return res.status(404).json({ message: 'Staff member not found' });
            
            // Ensure staff is in the right department
            if (staff.department && complaint.department && staff.department.toString() !== complaint.department.toString()) {
                return res.status(400).json({ message: 'Staff must belong to the department assigned to the complaint' });
            }
            
            complaint.assignedTo = staffId;
            
            // Notify Staff
            sendEmail({
                email: staff.email,
                subject: 'New Complaint Assigned to You',
                html: `<p>You have been assigned a new complaint: <b>${complaint.trackingId}</b></p>`
            }).catch(err => console.error('Staff Email Fail:', err.message));
        }

        complaint.timeline.push({
            status: complaint.status,
            description: note || `Complaint assigned to ${departmentId ? 'Department' : ''} ${staffId ? '& Staff' : ''}`,
            updatedBy: req.user._id
        });

        await complaint.save();

        res.json(complaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Create a new user (admin only)
// @route POST /api/admin/users
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;
        console.log('--- Create User Debug ---');
        console.log('Body:', { name, email, password: password ? '***' : 'MISSING', role, department });
        console.log('By User:', { id: req.user._id, role: req.user.role, dept: req.user.department });

        if (!name || !email || !password) {
            console.warn('❌ Create User Fail: Missing fields');
            return res.status(400).json({ message: 'Please provide all required fields: name, email, and password' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            console.warn(`❌ Create User Fail: User ${email} already exists`);
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        let finalRole = role || 'staff';
        let finalDept = (department === '' || !department) ? null : department;

        // --- Hierarchy Rules ---
        if (req.user.role === 'dept-admin') {
            if (!req.user.department) {
                console.warn(`❌ Create User Fail: Dept-Admin ${req.user.email} has no department`);
                return res.status(403).json({ message: 'You must be assigned to a department to create staff. Contact a Super Admin.' });
            }
            // Dept Admin can ONLY create staff for their own department
            finalRole = 'staff'; 
            finalDept = req.user.department;
        } else if (req.user.role === 'admin' || req.user.role === 'super-admin') {
            // Admins can set role and department
            finalRole = role || 'staff';
            finalDept = (department === '' || !department) ? null : department;
        } else {
            return res.status(403).json({ message: 'Unauthorized to create users' });
        }
        // -------------------------

        const user = await User.create({ 
            name, 
            email, 
            password, 
            role: finalRole,
            department: finalDept 
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Get all users
// @route GET /api/admin/users
exports.getUsers = async (req, res) => {
    try {
        let query = {};
        
        // Dept Admin and Staff only see their own department colleagues
        if (req.user.role === 'dept-admin' || req.user.role === 'staff') {
            if (!req.user.department) return res.json([]);
            query.department = req.user.department;
        } else if (req.query.department) {
            query.department = req.query.department;
        }

        const users = await User.find(query).select('-password').populate('department', 'name');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Update user role
// @route PUT /api/admin/users/:id/role
exports.updateUserRole = async (req, res) => {
    try {
        const { role, department } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // --- Security Check ---
        if (req.user.role === 'dept-admin') {
            if (!user.department || user.department.toString() !== req.user.department.toString()) {
                return res.status(403).json({ message: 'You can only manage your own staff' });
            }
            if (role && role !== 'staff') {
                return res.status(403).json({ message: 'Dept Admins can only assign Staff role' });
            }
            // Dept Admin cannot change department of users
        } else if (req.user.role === 'admin' || req.user.role === 'super-admin') {
            if (role) user.role = role;
            if (department !== undefined) user.department = department === '' ? null : department;
        }
        // ----------------------

        user.role = role;
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Get departments
// @route GET /api/admin/departments
exports.getDepartments = async (req, res) => {
    try {
        const departments = await Department.find().populate('head', 'name email').lean();
        
        if (!departments) return res.json([]);

        // Fetch counts for each department
        const departmentsWithCounts = await Promise.all(departments.map(async (dept) => {
            if (!dept || !dept._id) return dept;
            try {
                const count = await Complaint.countDocuments({ department: dept._id });
                return { ...dept, complaintCount: count };
            } catch (err) {
                console.error(`Error counting complaints for dept ${dept._id}:`, err);
                return { ...dept, complaintCount: 0 };
            }
        }));

        res.json(departmentsWithCounts || []);
    } catch (error) {
        console.error('getDepartments Error:', error);
        res.status(500).json({ 
            message: 'Error fetching departments', 
            error: error.message 
        });
    }
};

exports.createDepartment = async (req, res) => {
    try {
        const { name, head, description } = req.body;

        if (!name) return res.status(400).json({ message: 'Department name is required' });

        const deptExists = await Department.findOne({ name });
        if (deptExists) {
            return res.status(400).json({ message: 'A department with this name already exists' });
        }

        const dept = await Department.create({
            name,
            head: head || null, // Handle empty string from frontend
            description
        });

        // If a head is assigned, update their user record to link to this department
        if (head) {
            const headUser = await User.findById(head);
            if (headUser) {
                headUser.department = dept._id;
                // Auto-promote staff to dept-admin if they become a head
                if (headUser.role === 'staff') {
                    headUser.role = 'dept-admin';
                }
                await headUser.save();
            }
        }

        res.status(201).json(dept);
    } catch (error) {
        console.error('createDepartment Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc Delete user
// @route DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // --- Security Check ---
        if (req.user.role === 'dept-admin') {
            if (!user.department || user.department.toString() !== req.user.department.toString()) {
                return res.status(403).json({ message: 'Access denied: You can only delete your own department staff' });
            }
            if (user._id.toString() === req.user._id.toString()) {
                return res.status(400).json({ message: 'You cannot delete yourself' });
            }
        } else if (req.user.role === 'super-admin') {
            if (user.role === 'super-admin' && user._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Super Admin cannot delete another Super Admin' });
            }
        } else if (req.user.role === 'admin') {
            if (user.role === 'super-admin') {
                return res.status(403).json({ message: 'Admin cannot delete a Super Admin' });
            }
            if (user.role === 'admin' && user._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Admin cannot delete another Admin' });
            }
        }
        // ----------------------

        // Handle complaints created by this user
        await Complaint.updateMany({ user: user._id }, { user: null });
        // Handle complaints assigned to this user
        await Complaint.updateMany({ assignedTo: user._id }, { assignedTo: null });

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted and complaints unlinked' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Delete department
// @route DELETE /api/admin/departments/:id
exports.deleteDepartment = async (req, res) => {
    try {
        const dept = await Department.findById(req.params.id);
        if (!dept) return res.status(404).json({ message: 'Department not found' });

        // Unlink complaints from this department
        await Complaint.updateMany({ department: dept._id }, { department: null });

        await Department.findByIdAndDelete(req.params.id);
        res.json({ message: 'Department deleted and complaints unlinked' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

