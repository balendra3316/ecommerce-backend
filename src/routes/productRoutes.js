import express from 'express';
import {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
} from '../controllers/productController.js';
import { protect } from '../middlewares/authMiddleware.js'; // Assuming 'protect' is used for admin routes

const router = express.Router();

// Public routes
router.route('/').get(getProducts);
router.route('/:id').get(getProduct);

// Admin routes (Protected, assuming admin access will be added to middleware later)
router.route('/').post(protect, createProduct); // Admin only
router.route('/:id')
    .put(protect, updateProduct) // Admin only
    .delete(protect, deleteProduct); // Admin only

export default router;