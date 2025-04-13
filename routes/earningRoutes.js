const express = require('express');
const earningController = require('../controllers/earningController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

router.get('/my-earnings', earningController.getMyEarnings);
router.patch('/payment-info', earningController.updatePaymentInfo);
router.post('/withdraw', earningController.requestWithdrawal);

// Admin only routes
router.use(authController.restrictTo('admin'));
router.get('/stats', earningController.getEarningsStats);
router.get('/withdrawals', earningController.getAllWithdrawals);
router.patch('/withdrawals/:id', earningController.updateWithdrawalStatus);

module.exports = router; 