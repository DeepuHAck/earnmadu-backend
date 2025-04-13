const mongoose = require('mongoose');

const viewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'View must belong to a user']
    },
    video: {
        type: mongoose.Schema.ObjectId,
        ref: 'Video',
        required: [true, 'View must be associated with a video']
    },
    ip: {
        type: String,
        required: [true, 'IP address is required']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    cooldownStartedAt: {
        type: Date,
        default: Date.now
    },
    cooldownCompletedAt: {
        type: Date,
        default: null
    },
    cooldownStatus: {
        type: String,
        enum: ['active', 'completed', 'interrupted'],
        default: 'active'
    }
});

// Compound index to ensure unique views within time window
viewSchema.index(
    { user: 1, video: 1, createdAt: 1 },
    { unique: true, partialFilterExpression: { createdAt: { $exists: true } } }
);

// Index for querying views by IP
viewSchema.index({ ip: 1, createdAt: 1 });
viewSchema.index({ user: 1, cooldownStatus: 1, cooldownStartedAt: 1 });

// Static method to check if IP has exceeded view limit
viewSchema.statics.hasExceededIPLimit = async function(ip) {
    const viewsInLastDay = await this.countDocuments({
        ip,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    return viewsInLastDay >= parseInt(process.env.MAX_VIEWS_PER_IP_PER_DAY || 100);
};

// Static method to check if user is in cooldown
viewSchema.statics.isInCooldown = async function(userId) {
    const latestView = await this.findOne({
        user: userId,
        cooldownStatus: 'active',
        cooldownStartedAt: { 
            $gte: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes
        }
    }).sort({ cooldownStartedAt: -1 });

    if (!latestView) return false;

    // Calculate remaining cooldown time
    const cooldownEndTime = new Date(latestView.cooldownStartedAt.getTime() + 10 * 60 * 1000);
    const remainingTime = cooldownEndTime - new Date();
    
    return {
        isInCooldown: remainingTime > 0,
        remainingTime: Math.max(0, remainingTime),
        viewId: latestView._id
    };
};

// Method to complete cooldown
viewSchema.methods.completeCooldown = async function() {
    this.cooldownStatus = 'completed';
    this.cooldownCompletedAt = new Date();
    await this.save();
};

// Method to interrupt cooldown
viewSchema.methods.interruptCooldown = async function() {
    this.cooldownStatus = 'interrupted';
    await this.save();
};

const View = mongoose.model('View', viewSchema);

module.exports = View; 