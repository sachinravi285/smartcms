const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc Register user
// @route POST /api/auth/register
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({ name, email, password });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Login user
// @route POST /api/auth/login
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    console.log(`🔑 Login attempt for: ${email}`);

    try {
        // 1. Check if JWT_SECRET is configured
        if (!process.env.JWT_SECRET) {
            console.error('❌ CRITICAL: JWT_SECRET environment variable is missing!');
            return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing' });
        }

        // 2. Check Database Connection State
        const mongoose = require('mongoose');
        const connectDB = require('../config/db');

        if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
            console.log('🔄 Database not connected/connecting, attempting to connect...');
            await connectDB();
        }

        // Find user and populate department
        const user = await User.findOne({ email }).select('+password').populate('department', 'name');
        
        if (!user) {
            console.log(`🚫 User not found: ${email}`);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        console.log(`🔐 Password match for ${email}: ${isMatch}`);

        if (isMatch) {
            const token = generateToken(user._id.toString());
            
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department ? user.department._id : null,
                departmentName: user.department ? user.department.name : null,
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(`💥 Login Exception for ${email}:`, error);
        res.status(500).json({
            message: 'Internal Server Error during login',
            error: error.message,
            type: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc Get user profile
// @route GET /api/auth/profile
exports.getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id).populate('department', 'name');

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department ? user.department._id : null,
            departmentName: user.department ? user.department.name : null
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc Update user profile
// @route PUT /api/auth/profile
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            if (req.body.password) {
                user.password = req.body.password;
            }

            const savedUser = await user.save();
            const updatedUser = await User.findById(savedUser._id).populate('department', 'name');

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                department: updatedUser.department ? updatedUser.department._id : null,
                departmentName: updatedUser.department ? updatedUser.department.name : null,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
