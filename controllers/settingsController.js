const Settings = require('../models/Settings');
const Department = require('../models/Department');

// @desc Get public system settings (App Name, etc)
// @route GET /api/settings/public
exports.getPublicSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne().select('appName allowRegistration maintenanceMode');
        
        // If no settings found, return defaults instead of potentially crashing
        if (!settings) {
            return res.json({ 
                appName: 'SmartCMS',
                allowRegistration: true,
                maintenanceMode: false 
            });
        }

        res.json(settings);
    } catch (error) {
        console.error('❌ Settings Fetch Fail:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc Get public department list
// @route GET /api/settings/departments
exports.getPublicDepartments = async (req, res) => {
    try {
        const departments = await Department.find().select('name description');
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Get full system settings (Admin only)
// @route GET /api/settings
exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Update system settings
// @route PUT /api/settings
// @access Private (Super Admin only)
exports.updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        settings.appName = req.body.appName || settings.appName;
        settings.contactEmail = req.body.contactEmail || settings.contactEmail;
        settings.allowRegistration = req.body.allowRegistration !== undefined ? req.body.allowRegistration : settings.allowRegistration;
        settings.maintenanceMode = req.body.maintenanceMode !== undefined ? req.body.maintenanceMode : settings.maintenanceMode;

        settings.smtpHost = req.body.smtpHost || settings.smtpHost;
        settings.smtpPort = req.body.smtpPort || settings.smtpPort;
        settings.smtpUser = req.body.smtpUser || settings.smtpUser;
        settings.smtpPass = req.body.smtpPass || settings.smtpPass;
        settings.smtpFrom = req.body.smtpFrom || settings.smtpFrom;

        const updatedSettings = await settings.save();
        res.json(updatedSettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
