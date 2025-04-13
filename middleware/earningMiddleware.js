const Earning = require('../models/earningModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createEarningFromView = catchAsync(async (req, res, next) => {
    // This middleware should be used after video view is validated
    if (!req.user || !req.params.videoId) {
        return next(new AppError('User and video information required', 400));
    }

    // Calculate earning amount (can be configured based on various factors)
    const earningAmount = parseFloat(process.env.EARNING_PER_VIEW) || 0.01; // Default $0.01 per view

    // Check if user has already earned from this video in last 24 hours
    const lastDayEarning = await Earning.findOne({
        user: req.user.id,
        video: req.params.videoId,
        earnedAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
    });

    if (lastDayEarning) {
        return next(new AppError('Already earned from this video in last 24 hours', 400));
    }

    // Create earning record
    const earning = await Earning.create({
        user: req.user.id,
        video: req.params.videoId,
        amount: earningAmount
    });

    // Update user's total earnings
    await req.user.updateOne({
        $inc: { totalEarnings: earningAmount }
    });

    // Attach earning to request object for potential use in next middleware
    req.earning = earning;
    next();
});

exports.checkEarningEligibility = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You must be logged in to earn', 401));
    }

    // Check if user has exceeded daily view limit
    if (req.user.hasExceededDailyLimit()) {
        return next(new AppError('Daily view limit exceeded', 400));
    }

    // Check if user's IP is banned or restricted
    if (req.ipBanned) {
        return next(new AppError('Your IP is restricted from earning', 403));
    }

    // Check if video is eligible for earnings
    if (req.video && !req.video.monetizable) {
        return next(new AppError('This video is not eligible for earnings', 400));
    }

    next();
});

exports.getEarningStats = catchAsync(async (req, res, next) => {
    const stats = await Earning.aggregate([
        {
            $match: {
                user: req.user._id
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$earnedAt'
                    }
                },
                dailyEarnings: { $sum: '$amount' },
                videoCount: { $sum: 1 }
            }
        },
        {
            $sort: { _id: -1 }
        },
        {
            $limit: 30 // Last 30 days
        }
    ]);

    req.earningStats = stats;
    next();
}); 