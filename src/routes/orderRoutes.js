import express from 'express';
import {
    placeCODOrder,
    createRazorpayOrder,
    razorpayPaymentSuccess,
    getAdminOrders,
    getAdminOrder,
    updateOrderStatus,
    getUserOrders,
} from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { protectAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// --- Public/User Checkout Routes ---
router.post('/cod',protect, placeCODOrder);
router.post('/razorpay',protect, createRazorpayOrder);
router.post('/payment-success',protect, razorpayPaymentSuccess); // Razorpay Webhook/Redirect

router.get('/my-orders', protect, getUserOrders);
// --- Admin Management Routes (Protected) ---
router.route('/')
    .get(protectAdmin, getAdminOrders); // Admin only, will need proper role checking
router.route('/:id')
    .get(protectAdmin, getAdminOrder); // Admin only
router.route('/:id/status')
    .put(protectAdmin, updateOrderStatus); // Admin only

export default router;