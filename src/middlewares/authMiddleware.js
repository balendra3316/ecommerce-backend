import jwt from 'jsonwebtoken';
import User from '../models/userModel.js'

// Protect routes
export const protect = async (req, res, next) => {
    let token;

    if (req.cookies.token) {
        token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};