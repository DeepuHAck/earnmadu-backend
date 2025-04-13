const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Earning must belong to a user']
    },
    video: {
        type: mongoose.Schema.ObjectId,
        ref: 'Video',
        required: [true, 'Earning must be associated with a video']
    },
    amount: {
        type: Number,
        required: [true, 'Earning must have an amount'],
        min: [0, 'Earning amount cannot be negative']
    },
    earnedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
earningSchema.index({ user: 1, video: 1 });
earningSchema.index({ earnedAt: -1 });

const Earning = mongoose.model('Earning', earningSchema);

module.exports = Earning; 