import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: true,
    },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Quantity must be at least 1']
    },
    size: { type: String, required: true },
    
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // Each user can only have one active cart
    },
    items: [cartItemSchema],
    // Calculate total price on the fly in the controller/frontend or use a pre-save hook
    totalPrice: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true,
});

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;