const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    youtubeId: {
        type: String,
        required: [true, 'Video must have a YouTube ID'],
        unique: true
    },
    title: {
        type: String,
        required: [true, 'Video must have a title']
    },
    description: String,
    thumbnailUrl: String,
    duration: String,
    channelTitle: String,
    channelId: String,
    viewCount: {
        type: Number,
        default: 0
    },
    earnings: {
        perView: {
            type: Number,
            required: [true, 'Video must have earnings per view'],
            default: 0.01 // Default 1 cent per view
        },
        total: {
            type: Number,
            default: 0
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'pending'
    },
    category: {
        type: String,
        required: [true, 'Video must have a category']
    },
    addedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Video must belong to a user']
    },
    views: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        ip: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        earned: Number
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
videoSchema.index({ youtubeId: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ category: 1 });

// Virtual populate
videoSchema.virtual('totalViews').get(function() {
    return this.views.length;
});

// Static method to check if a video has been watched by an IP today
videoSchema.statics.hasBeenWatchedByIP = async function(videoId, ip) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const views = await this.findOne({
        _id: videoId,
        'views.ip': ip,
        'views.timestamp': { $gte: today }
    });

    return !!views;
};

const Video = mongoose.model('Video', videoSchema);
module.exports = Video; 