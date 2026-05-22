const express = require('express');
const router = express.Router();
const {
    getAllComplaints,
    updateComplaintStatus,
    getAnalytics,
    exportToExcel,
    getComplaintById,
    assignComplaint,
    createUser,
    getUsers,
    updateUserRole,
    deleteUser,
    getDepartments,
    createDepartment,
    deleteDepartment
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Basic protection for all admin routes, but specific sub-routes will have tighter role checks
router.use(protect);

// Complaint & Analytics routes - accessible by Staff, Dept-Admin, Admin, and Super-Admin
router.get('/complaints', authorize('staff', 'dept-admin', 'admin', 'super-admin'), getAllComplaints);
router.get('/complaints/:id', authorize('staff', 'dept-admin', 'admin', 'super-admin'), getComplaintById);
router.put('/complaints/:id/status', authorize('staff', 'dept-admin', 'admin', 'super-admin'), updateComplaintStatus);
router.put('/complaints/:id/assign', authorize('staff', 'dept-admin', 'admin', 'super-admin'), assignComplaint);
router.get('/analytics', authorize('staff', 'dept-admin', 'admin', 'super-admin'), getAnalytics);
router.get('/export', authorize('staff', 'dept-admin', 'admin', 'super-admin'), exportToExcel);

// User management - GET accessible by Staff+ for dropdowns, others restricted
router.get('/users', authorize('staff', 'dept-admin', 'admin', 'super-admin'), getUsers);
router.post('/users', authorize('dept-admin', 'admin', 'super-admin'), createUser);
router.put('/users/:id/role', authorize('dept-admin', 'admin', 'super-admin'), updateUserRole);
router.delete('/users/:id', authorize('dept-admin', 'admin', 'super-admin'), deleteUser);

// Department management - GET accessible by Staff+ for detail views, others restricted
router.get('/departments', authorize('staff', 'dept-admin', 'admin', 'super-admin'), getDepartments);
router.post('/departments', authorize('admin', 'super-admin'), createDepartment);
router.delete('/departments/:id', authorize('admin', 'super-admin'), deleteDepartment);

module.exports = router;
