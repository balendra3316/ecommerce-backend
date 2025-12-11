import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
    },
    razorpayPaymentId: {
        type: String,
        default: null, // Will be filled upon payment success
        unique: true,
        sparse: true, // Allows multiple documents with null value
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'INR',
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending',
    },
    orderData: {
        type: Object, // Stores a snapshot of the cart/address/items before payment
        required: true,
    },
    orderRef: {
        // Link to the final Order model, only created on success
        type: mongoose.Schema.ObjectId,
        ref: 'Order',
        default: null,
    }
}, {
    timestamps: true,
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;