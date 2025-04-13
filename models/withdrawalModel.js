const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Withdrawal must belong to a user']
    },
    amount: {
        type: Number,
        required: [true, 'Withdrawal must have an amount'],
        min: [0, 'Withdrawal amount cannot be negative']
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: [true, 'Payment method is required'],
        enum: ['paypal', 'bank_transfer', 'crypto']
    },
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'Payment details are required']
    },
    processedAt: {
        type: Date,
        default: null
    },
    notes: {
        type: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
withdrawalSchema.index({ user: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

// Update processedAt when status changes to completed
withdrawalSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'completed') {
        this.processedAt = Date.now();
    }
    next();
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

module.exports = Withdrawal; 