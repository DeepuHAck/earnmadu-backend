const View = require('../models/viewModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.checkCooldown = catchAsync(async (req, res, next) => {
    const cooldownStatus = await View.isInCooldown(req.user.id);

    if (cooldownStatus && cooldownStatus.isInCooldown) {
        return res.status(429).json({
            status: 'cooldown',
            message: '⏳ Please wait for the cooldown to finish',
            data: {
                remainingTime: cooldownStatus.remainingTime,
                viewId: cooldownStatus.viewId
            }
        });
    }

    next();
});

exports.startCooldown = catchAsync(async (req, res, next) => {
    // The view record is already created in recordVideoView middleware
    // We just need to ensure cooldown fields are set
    const view = await View.findOne({
        user: req.user.id,
        video: req.video.id
    }).sort({ createdAt: -1 });

    if (!view) {
        return next(new AppError('View record not found', 404));
    }

    view.cooldownStartedAt = new Date();
    view.cooldownStatus = 'active';
    await view.save();

    // Attach cooldown info to request for response
    req.cooldown = {
        viewId: view._id,
        startedAt: view.cooldownStartedAt,
        duration: 10 * 60 * 1000 // 10 minutes in milliseconds
    };

    next();
});

exports.verifyCooldownCompletion = catchAsync(async (req, res, next) => {
    const { viewId } = req.params;

    const view = await View.findById(viewId);
    if (!view) {
        return next(new AppError('View record not found', 404));
    }

    // Verify the view belongs to the user
    if (view.user.toString() !== req.user.id) {
        return next(new AppError('Not authorized', 403));
    }

    // Check if cooldown is still active and enough time has passed
    const cooldownEndTime = new Date(view.cooldownStartedAt.getTime() + 10 * 60 * 1000);
    const now = new Date();

    if (view.cooldownStatus !== 'active') {
        return next(new AppError('Cooldown already completed or interrupted', 400));
    }

    if (now < cooldownEndTime) {
        return next(new AppError('Cooldown period not completed yet', 400));
    }

    // Complete the cooldown
    await view.completeCooldown();

    res.status(200).json({
        status: 'success',
        message: 'Cooldown completed successfully',
        data: {
            nextVideoEnabled: true
        }
    });
});

exports.interruptCooldown = catchAsync(async (req, res, next) => {
    const { viewId } = req.params;

    const view = await View.findById(viewId);
    if (!view) {
        return next(new AppError('View record not found', 404));
    }

    // Verify the view belongs to the user
    if (view.user.toString() !== req.user.id) {
        return next(new AppError('Not authorized', 403));
    }

    if (view.cooldownStatus !== 'active') {
        return next(new AppError('Cooldown already completed or interrupted', 400));
    }

    // Interrupt the cooldown
    await view.interruptCooldown();

    res.status(200).json({
        status: 'success',
        message: 'Cooldown interrupted',
        data: {
            nextVideoEnabled: false
        }
    });
}); 