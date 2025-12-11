import express from 'express';
import {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getCart,
    updateCart,
    clearCart,
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes here require the user to be logged in
router.use(protect);

// --- Address Routes ---
router.route('/addresses')
    .get(getAddresses)
    .post(addAddress);

router.route('/addresses/:id')
    .put(updateAddress)
    .delete(deleteAddress);

// --- Cart Routes ---
router.route('/cart')
    .get(getCart)
    .post(updateCart) // Used for add/update item
    .delete(clearCart); // Used for clearing the entire cart

export default router;