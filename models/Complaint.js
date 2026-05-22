const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    trackingId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    guestName: { type: String },
    guestEmail: { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved', 'Closed'],
        default: 'Pending'
    },
    attachments: [{
        url: String,
        publicId: String,
        format: String
    }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    timeline: [{
        status: String,
        description: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
