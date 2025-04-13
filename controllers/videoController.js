const { google } = require('googleapis');
const Video = require('../models/videoModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const View = require('../models/viewModel');

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

exports.addVideo = catchAsync(async (req, res, next) => {
    const { youtubeUrl, category } = req.body;
    const youtubeId = extractYoutubeId(youtubeUrl);

    if (!youtubeId) {
        return next(new AppError('Invalid YouTube URL', 400));
    }

    // Check if video already exists
    const existingVideo = await Video.findOne({ youtubeId });
    if (existingVideo) {
        return next(new AppError('Video already exists in the system', 400));
    }

    // Fetch video details from YouTube API
    const videoDetails = await youtube.videos.list({
        part: 'snippet,contentDetails',
        id: youtubeId
    });

    if (!videoDetails.data.items.length) {
        return next(new AppError('Video not found on YouTube', 404));
    }

    const videoData = videoDetails.data.items[0];
    const video = await Video.create({
        youtubeId,
        title: videoData.snippet.title,
        description: videoData.snippet.description,
        thumbnailUrl: videoData.snippet.thumbnails.high.url,
        duration: videoData.contentDetails.duration,
        channelTitle: videoData.snippet.channelTitle,
        channelId: videoData.snippet.channelId,
        category,
        addedBy: req.user._id
    });

    res.status(201).json({
        status: 'success',
        data: { video }
    });
});

exports.getVideos = catchAsync(async (req, res, next) => {
    const videos = await Video.find({ status: 'active' })
        .sort('-createdAt')
        .populate('addedBy', 'name');

    res.status(200).json({
        status: 'success',
        results: videos.length,
        data: { videos }
    });
});

exports.watchVideo = catchAsync(async (req, res, next) => {
    const video = await Video.findById(req.params.id);
    if (!video) {
        return next(new AppError('Video not found', 404));
    }

    const user = await User.findById(req.user._id);
    if (user.hasExceededDailyLimit()) {
        return next(new AppError('Daily view limit exceeded', 400));
    }

    // Check if video has been watched by this IP today
    const hasWatched = await Video.hasBeenWatchedByIP(video._id, req.ip);
    if (hasWatched) {
        return next(new AppError('You have already watched this video today', 400));
    }

    // Record the view
    video.views.push({
        user: req.user._id,
        ip: req.ip,
        earned: video.earnings.perView
    });
    video.viewCount += 1;
    await video.save();

    // Update user's earnings and view count
    user.earnings.pending += video.earnings.perView;
    user.earnings.total += video.earnings.perView;
    user.dailyViewCount.count += 1;
    user.watchHistory.push({
        video: video._id,
        earned: video.earnings.perView
    });
    await user.save();

    res.status(200).json({
        status: 'success',
        data: {
            earned: video.earnings.perView,
            dailyViewCount: user.dailyViewCount.count
        }
    });
});

exports.updateVideoStatus = catchAsync(async (req, res, next) => {
    const video = await Video.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true, runValidators: true }
    );

    if (!video) {
        return next(new AppError('Video not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { video }
    });
});

// Public video access
exports.getAllVideos = catchAsync(async (req, res, next) => {
    const videos = await Video.find({ status: 'published' })
        .select('-__v')
        .populate('creator', 'name');

    res.status(200).json({
        status: 'success',
        results: videos.length,
        data: { videos }
    });
});

exports.getTrendingVideos = catchAsync(async (req, res, next) => {
    const videos = await Video.find({ status: 'published' })
        .sort('-viewCount -createdAt')
        .limit(20)
        .select('-__v')
        .populate('creator', 'name');

    res.status(200).json({
        status: 'success',
        results: videos.length,
        data: { videos }
    });
});

exports.searchVideos = catchAsync(async (req, res, next) => {
    const { query } = req.query;
    if (!query) {
        return next(new AppError('Please provide a search query', 400));
    }

    const videos = await Video.find({
        status: 'published',
        $or: [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ]
    })
    .select('-__v')
    .populate('creator', 'name');

    res.status(200).json({
        status: 'success',
        results: videos.length,
        data: { videos }
    });
});

exports.getVideo = catchAsync(async (req, res, next) => {
    const video = await Video.findById(req.params.id)
        .populate('creator', 'name')
        .select('-__v');

    if (!video) {
        return next(new AppError('No video found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { video }
    });
});

// Video view handling
exports.validateVideoView = catchAsync(async (req, res, next) => {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
        return next(new AppError('No video found with that ID', 404));
    }

    // Check if video is published
    if (video.status !== 'published') {
        return next(new AppError('This video is not available', 403));
    }

    // Check for recent views from this user/IP to prevent abuse
    const recentView = await View.findOne({
        user: req.user.id,
        video: video.id,
        createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes
    });

    if (recentView) {
        return next(new AppError('Please wait before viewing this video again', 400));
    }

    req.video = video;
    next();
});

exports.recordVideoView = catchAsync(async (req, res, next) => {
    // Create view record
    await View.create({
        user: req.user.id,
        video: req.video.id,
        ip: req.ip
    });

    // Increment video view count
    await Video.findByIdAndUpdate(req.video.id, {
        $inc: { viewCount: 1 }
    });

    next();
});

exports.sendViewResponse = (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            message: 'View recorded successfully',
            earning: req.earning,
            cooldown: {
                viewId: req.cooldown.viewId,
                startedAt: req.cooldown.startedAt,
                duration: req.cooldown.duration,
                message: '⏳ Hold down for 10 minutes here without closing or going back to get the next video.'
            }
        }
    });
};

// User's video management
exports.getMyVideos = catchAsync(async (req, res, next) => {
    const videos = await Video.find({ creator: req.user.id })
        .select('-__v');

    res.status(200).json({
        status: 'success',
        results: videos.length,
        data: { videos }
    });
});

exports.uploadVideo = catchAsync(async (req, res, next) => {
    // Video upload logic here (using your preferred upload service)
    next();
});

exports.processVideo = catchAsync(async (req, res, next) => {
    // Video processing logic here (transcoding, thumbnail generation, etc.)
    next();
});

exports.createVideo = catchAsync(async (req, res, next) => {
    const video = await Video.create({
        ...req.body,
        creator: req.user.id
    });

    res.status(201).json({
        status: 'success',
        data: { video }
    });
});

exports.checkVideoOwnership = catchAsync(async (req, res, next) => {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
        return next(new AppError('No video found with that ID', 404));
    }

    if (video.creator.toString() !== req.user.id) {
        return next(new AppError('You do not have permission to modify this video', 403));
    }

    req.video = video;
    next();
});

exports.updateVideo = catchAsync(async (req, res, next) => {
    const video = await Video.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        status: 'success',
        data: { video }
    });
});

exports.deleteVideo = catchAsync(async (req, res, next) => {
    await Video.findByIdAndDelete(req.params.id);

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Admin controllers
exports.getAllVideosAdmin = catchAsync(async (req, res, next) => {
    const videos = await Video.find()
        .populate('creator', 'name email')
        .select('-__v');

    res.status(200).json({
        status: 'success',
        results: videos.length,
        data: { videos }
    });
});

exports.getVideoAdmin = catchAsync(async (req, res, next) => {
    const video = await Video.findById(req.params.id)
        .populate('creator', 'name email')
        .select('-__v');

    if (!video) {
        return next(new AppError('No video found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { video }
    });
});

exports.updateVideoAdmin = catchAsync(async (req, res, next) => {
    const video = await Video.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
            runValidators: true
        }
    ).populate('creator', 'name email');

    if (!video) {
        return next(new AppError('No video found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { video }
    });
});

exports.deleteVideoAdmin = catchAsync(async (req, res, next) => {
    const video = await Video.findByIdAndDelete(req.params.id);

    if (!video) {
        return next(new AppError('No video found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Utility function to extract YouTube ID from URL
const extractYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}; 