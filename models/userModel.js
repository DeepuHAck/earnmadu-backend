const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function(el) {
                return el === this.password;
            },
            message: 'Passwords do not match'
        }
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    earnings: {
        total: {
            type: Number,
            default: 0
        },
        pending: {
            type: Number,
            default: 0
        },
        withdrawn: {
            type: Number,
            default: 0
        }
    },
    watchHistory: [{
        video: {
            type: mongoose.Schema.ObjectId,
            ref: 'Video'
        },
        watchedAt: {
            type: Date,
            default: Date.now
        },
        earned: {
            type: Number,
            default: 0
        }
    }],
    dailyViewCount: {
        count: {
            type: Number,
            default: 0
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    paymentInfo: {
        paypalEmail: String,
        bankDetails: {
            accountName: String,
            accountNumber: String,
            bankName: String,
            ifscCode: String
        }
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['paypal', 'bank_transfer', 'crypto'],
        default: null
    },
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
        select: false
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    lastWithdrawal: {
        type: Date,
        default: null
    },
    withdrawalEligible: {
        type: Boolean,
        default: false
    }
});

// Middleware to hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    if (this.isModified('totalEarnings')) {
        this.withdrawalEligible = await this.checkWithdrawalEligibility();
    }
    next();
});

// Instance method to check if password is correct
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if user has exceeded daily view limit
userSchema.methods.hasExceededDailyLimit = function() {
    const today = new Date().setHours(0, 0, 0, 0);
    const userDate = new Date(this.dailyViewCount.date).setHours(0, 0, 0, 0);
    
    if (today > userDate) {
        this.dailyViewCount.count = 0;
        this.dailyViewCount.date = new Date();
        return false;
    }
    
    return this.dailyViewCount.count >= process.env.MAX_VIEWS_PER_DAY;
};

// Add this before the User model is created
userSchema.virtual('availableBalance', {
    ref: 'Earning',
    localField: '_id',
    foreignField: 'user',
    pipeline: [
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ],
    justOne: true
});

userSchema.virtual('pendingWithdrawals', {
    ref: 'Withdrawal',
    localField: '_id',
    foreignField: 'user',
    match: { status: 'pending' }
});

// Add method to check withdrawal eligibility
userSchema.methods.checkWithdrawalEligibility = function() {
    const minimumBalance = 10; // $10 minimum withdrawal
    return this.availableBalance >= minimumBalance;
};

const User = mongoose.model('User', userSchema);
module.exports = User; 