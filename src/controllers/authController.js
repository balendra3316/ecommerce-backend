
import User from '../models/userModel.js';
import OTP from '../models/otpModel.js';
import sendEmail from '../config/SendEmail.js';

// Utility to send token in a cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    // Remove sensitive data before sending user object
    user.password = undefined;

    res.status(statusCode)
        .cookie('token', token, options)
        .json({ success: true, token, user });
};

// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });

        // If user exists but is not verified, overwrite their data and resend OTP
        if (user && !user.isVerified) {
             user.name = name;
             user.password = password;
        } else if (user && user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email is already registered' });
        } else {
            user = new User({ name, email, password });
        }

        await user.save();

        // Generate and save OTP in separate model
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        await OTP.create({ email, otp });

        const message = `Welcome to ACD Dance Journal! Your One-Time Password (OTP) for account verification is: ${otp}. It is valid for 10 minutes.`;
        await sendEmail({ email: user.email, subject: 'ACD Dance Journal - Verify Your Email', message });

        res.status(200).json({ success: true, message: `An OTP has been sent to ${user.email}` });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Verify OTP for registration
// @route   POST /api/auth/verify-registration
export const verifyRegistrationOtp = async (req, res) => {
    const { email, otp } = req.body;
    console.log(email, otp);
    try {
        const otpRecord = await OTP.findOne({ email, otp });

        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isVerified = true;
        await user.save();
        
        // Delete the OTP record after verification
        await OTP.deleteOne({ _id: otpRecord._id });

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isVerified) {
        return res.status(401).json({ success: false, message: 'Invalid credentials or user not verified' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
    // req.user is set by the protect middleware
    res.status(200).json({ success: true, data: req.user });
};

// @desc    Logout user
// @route   GET /api/auth/logout
export const logout = async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ success: true, data: {} });
};


// @desc    Forgot password
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    await OTP.create({ email: user.email, otp });

    try {
        const message = `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`;
        await sendEmail({ email: user.email, subject: 'Password reset OTP', message });
        res.status(200).json({ success: true, data: 'OTP Sent' });
    } catch (err) {
        // Delete the OTP record if email fails
        await OTP.deleteOne({ email: user.email, otp });
        return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
};


// @desc    Reset password
// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
    const { email, otp, password } = req.body;
    
    try {
        const otpRecord = await OTP.findOne({ email, otp });

        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.password = password;
        await user.save();

        // Delete the OTP record after password reset
        await OTP.deleteOne({ _id: otpRecord._id });

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

