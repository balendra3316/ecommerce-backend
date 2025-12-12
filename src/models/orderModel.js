import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: {
        // Link to the User model if the order is placed by a logged-in user
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: false // Optional for guest checkout
    },
    orderItems: [
        {
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            image: { type: String, required: true },
            price: { type: Number, required: true },
            product: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product',
                required: true,
            },
            // Specific options selected for the item
            size: { type: String, required: true },
            
        },
    ],
    // --- Order Status and Payment Details ---
    totalAmount: {
        type: Number,
        required: true,
    },
    orderStatus: {
        type: String,
        enum: ['New', 'Packed', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'New'
    },
    paymentMethod: {
        type: String,
        enum: ['UPI', 'Card', 'COD', 'Razorpay'],
        required: true,
    },
    paymentDetails: {
        razorpayPaymentId: String,
        razorpayOrderId: String,
        isPaid: {
            type: Boolean,
            default: false,
        },
        paidAt: Date,
    },
    
    // --- Shipping Address (Large & Clear for Courier) ---
    shippingAddress: {
        shipping_name: { type: String, required: [true, 'Shipping name is required'] },
        shipping_address_line1: { type: String, required: [true, 'Shipping address line 1 is required'] },
        shipping_address_line2: { type: String },
        shipping_city: { type: String, required: [true, 'Shipping city is required'] },
        shipping_state: { type: String, required: [true, 'Shipping state is required'] },
        shipping_pincode: { type: String, required: [true, 'Shipping pincode is required'] },
        shipping_phone: { type: String, required: [true, 'Shipping phone is required'] },
        shipping_email: { type: String }, // Optional, as requested
    },
    
    // --- Billing Address (Smaller for Records) ---
    billingAddress: {
        billing_name: { type: String, required: [true, 'Billing name is required'] },
        billing_address_line1: { type: String, required: [true, 'Billing address line 1 is required'] },
        billing_address_line2: { type: String },
        billing_city: { type: String, required: [true, 'Billing city is required'] },
        billing_state: { type: String, required: [true, 'Billing state is required'] },
        billing_pincode: { type: String, required: [true, 'Billing pincode is required'] },
        billing_phone: { type: String, required: [true, 'Billing phone is required'] },
        billing_email: { type: String }, // Optional, as requested
    },

}, {
    timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);
export default Order;