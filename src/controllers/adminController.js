import Admin from '../models/adminModel.js';
import ErrorResponse from '../utils/errorResponse.js';

const sendTokenResponse = (admin, statusCode, res) => {
    const token = admin.getSignedJwtToken();
    const options = {
        expires: new Date(Date.now() + process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    admin.password = undefined;

    res.status(statusCode)
        .cookie('adminToken', token, options) // Note: Using 'adminToken' cookie name
        .json({ success: true, token, data: admin });
};

// @desc    Login Admin
// @route   POST /api/admin/login
export const loginAdmin = async (req, res, next) => {
    const { email, password } = req.body;

    console.log(email, password);

    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(admin, 200, res);
};

// @desc    Get current logged in admin
// @route   GET /api/admin/me
export const getAdminMe = async (req, res, next) => {
    const admin = await Admin.findById(req.admin.id);
    res.status(200).json({ success: true, data: admin });
};

// @desc    Logout Admin
// @route   GET /api/admin/logout
export const logoutAdmin = async (req, res, next) => {
    res.cookie('adminToken', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ success: true, data: {} });
};

// @desc    Create first admin (Seed helper)
// @route   POST /api/admin/create-seed
export const createSeedAdmin = async (req, res, next) => {
    const { email, password } = req.body;
    const admin = await Admin.create({ email, password });
    sendTokenResponse(admin, 201, res);
}