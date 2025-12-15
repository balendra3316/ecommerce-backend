import jwt from 'jsonwebtoken';
import Admin from '../models/adminModel.js';
import ErrorResponse from '../utils/errorResponse.js';

export const protectAdmin = async (req, res, next) => {
    let token;

    if (req.cookies.adminToken) {
        token = req.cookies.adminToken;
    }

    if (!token) {
        return next(new ErrorResponse('Not authorized to access admin routes', 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = await Admin.findById(decoded.id);
        
        if (!req.admin) {
             return next(new ErrorResponse('Admin not found', 401));
        }
        
        next();
    } catch (err) {
        return next(new ErrorResponse('Not authorized to access admin routes', 401));
    }
};