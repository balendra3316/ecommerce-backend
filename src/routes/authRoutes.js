import express from 'express';
import {
    register,
    verifyRegistrationOtp,
    login,
    getMe,
    logout,
    forgotPassword,
    resetPassword,
} from '../controllers/authController.js';
import  {protect}  from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-registration', verifyRegistrationOtp);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;