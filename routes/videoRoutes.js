const express = require('express');
const videoController = require('../controllers/videoController');
const authController = require('../controllers/authController');
const earningMiddleware = require('../middleware/earningMiddleware');
const cooldownMiddleware = require('../middleware/cooldownMiddleware');

const router = express.Router();

// Public routes
router.get('/', videoController.getAllVideos);
router.get('/trending', videoController.getTrendingVideos);
router.get('/search', videoController.searchVideos);
router.get('/:id', videoController.getVideo);

// Protected routes - require authentication
router.use(authController.protect);

// Video view and earning routes
router.post('/:videoId/view',
    cooldownMiddleware.checkCooldown,
    videoController.validateVideoView,
    earningMiddleware.checkEarningEligibility,
    videoController.recordVideoView,
    cooldownMiddleware.startCooldown,
    earningMiddleware.createEarningFromView,
    videoController.sendViewResponse
);

// Cooldown management routes
router.post('/cooldown/:viewId/complete',
    cooldownMiddleware.verifyCooldownCompletion
);

router.post('/cooldown/:viewId/interrupt',
    cooldownMiddleware.interruptCooldown
);

// User's video management routes
router.route('/my-videos')
    .get(videoController.getMyVideos)
    .post(
        videoController.uploadVideo,
        videoController.processVideo,
        videoController.createVideo
    );

router.route('/my-videos/:id')
    .patch(
        videoController.checkVideoOwnership,
        videoController.updateVideo
    )
    .delete(
        videoController.checkVideoOwnership,
        videoController.deleteVideo
    );

// Admin only routes
router.use(authController.restrictTo('admin'));

router.route('/admin/videos')
    .get(videoController.getAllVideosAdmin)
    .post(videoController.createVideo);

router.route('/admin/videos/:id')
    .get(videoController.getVideoAdmin)
    .patch(videoController.updateVideoAdmin)
    .delete(videoController.deleteVideoAdmin);

module.exports = router; 