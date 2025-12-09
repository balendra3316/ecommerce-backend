import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
//import crypto from 'crypto';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false, // Don't return password by default
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    subscription: {
        status: {
            type: String,
            enum: ['none', 'active', 'expired'],
            default: 'none',
        },
        endDate: Date,
        razorpayPaymentId: String,
    },
    // Progress Tracking
    currentStreak: {
        type: Number,
        default: 0,
    },
    longestStreak: {
        type: Number,
        default: 0,
    },
    lastPracticeDate: {
        type: Date,
    },
    badges: [{
        name: String,
        earnedOn: Date,
    }],
}, {
    timestamps: true,
});

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;