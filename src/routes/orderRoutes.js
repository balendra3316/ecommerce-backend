import express from 'express';
import {
    placeCODOrder,
    createRazorpayOrder,
    razorpayPaymentSuccess,
    getAdminOrders,
    getAdminOrder,
    updateOrderStatus,
} from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- Public/User Checkout Routes ---
router.post('/cod', placeCODOrder);
router.post('/razorpay', createRazorpayOrder);
router.post('/payment-success', razorpayPaymentSuccess); // Razorpay Webhook/Redirect

// --- Admin Management Routes (Protected) ---
router.route('/')
    .get(protect, getAdminOrders); // Admin only, will need proper role checking
router.route('/:id')
    .get(protect, getAdminOrder); // Admin only
router.route('/:id/status')
    .put(protect, updateOrderStatus); // Admin only

export default router;