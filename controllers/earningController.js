const Earning = require('../models/earningModel');
const User = require('../models/userModel');
const Withdrawal = require('../models/withdrawalModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getMyEarnings = catchAsync(async (req, res, next) => {
    const earnings = await Earning.find({ user: req.user.id });
    const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);
    
    const withdrawals = await Withdrawal.find({ user: req.user.id });
    const totalWithdrawn = withdrawals
        .filter(w => w.status === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    res.status(200).json({
        status: 'success',
        data: {
            earnings,
            totalEarnings,
            totalWithdrawn,
            availableBalance: totalEarnings - totalWithdrawn
        }
    });
});

exports.updatePaymentInfo = catchAsync(async (req, res, next) => {
    const { paymentMethod, paymentDetails } = req.body;

    if (!paymentMethod || !paymentDetails) {
        return next(new AppError('Please provide payment method and details', 400));
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        {
            paymentMethod,
            paymentDetails
        },
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

exports.requestWithdrawal = catchAsync(async (req, res, next) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return next(new AppError('Please provide a valid withdrawal amount', 400));
    }

    // Get user's available balance
    const earnings = await Earning.find({ user: req.user.id });
    const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);
    
    const withdrawals = await Withdrawal.find({ user: req.user.id });
    const totalWithdrawn = withdrawals
        .filter(w => w.status === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const availableBalance = totalEarnings - totalWithdrawn;

    if (amount > availableBalance) {
        return next(new AppError('Insufficient balance for withdrawal', 400));
    }

    // Check if user has payment info
    if (!req.user.paymentMethod || !req.user.paymentDetails) {
        return next(new AppError('Please update your payment information first', 400));
    }

    const withdrawal = await Withdrawal.create({
        user: req.user.id,
        amount,
        paymentMethod: req.user.paymentMethod,
        paymentDetails: req.user.paymentDetails,
        status: 'pending'
    });

    res.status(201).json({
        status: 'success',
        data: {
            withdrawal
        }
    });
});

exports.getEarningsStats = catchAsync(async (req, res, next) => {
    const totalEarnings = await Earning.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    const totalWithdrawals = await Withdrawal.aggregate([
        {
            $match: { status: 'completed' }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    const pendingWithdrawals = await Withdrawal.aggregate([
        {
            $match: { status: 'pending' }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            totalEarnings: totalEarnings[0] || { total: 0, count: 0 },
            totalWithdrawals: totalWithdrawals[0] || { total: 0, count: 0 },
            pendingWithdrawals: pendingWithdrawals[0] || { total: 0, count: 0 }
        }
    });
});

exports.getAllWithdrawals = catchAsync(async (req, res, next) => {
    const withdrawals = await Withdrawal.find().populate('user', 'name email');

    res.status(200).json({
        status: 'success',
        data: {
            withdrawals
        }
    });
});

exports.updateWithdrawalStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;

    if (!['pending', 'completed', 'rejected'].includes(status)) {
        return next(new AppError('Invalid withdrawal status', 400));
    }

    const withdrawal = await Withdrawal.findByIdAndUpdate(
        req.params.id,
        { status },
        {
            new: true,
            runValidators: true
        }
    ).populate('user', 'name email');

    if (!withdrawal) {
        return next(new AppError('No withdrawal found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            withdrawal
        }
    });
}); 