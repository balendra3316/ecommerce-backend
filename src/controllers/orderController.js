import Order from '../models/orderModel.js';
import Product from '../models/productModel.js'; // To check/update stock
import Payment from '../models/paymentModel.js'; // To track payment status
import sendEmail from '../config/SendEmail.js';  // To send confirmation email
import ErrorResponse from '../utils/errorResponse.js';
import Razorpay from 'razorpay';
import crypto from 'crypto'; // Node.js built-in module for signature verification

// --- Razorpay Setup (using keys from your .env file) ---

// Helper function to check stock availability for all items
const checkStock = async (items) => {
    const outOfStockItems = [];
    for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product || product.stock < item.quantity) {
            outOfStockItems.push({ 
                name: item.name, 
                requested: item.quantity, 
                available: product ? product.stock : 0 
            });
        }
    }
    return outOfStockItems;
};

// Helper function to update product stock after a successful order
const updateStock = async (items) => {
    for (const item of items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }
};

// Helper function to generate a readable order summary for email
const generateOrderSummary = (order) => {
    const itemsList = order.orderItems.map(item => 
        `<li>${item.name} (${item.size}) - Qty: ${item.quantity} @ ₹${item.price}</li>`
    ).join('');

    return `
        <h2>Order Confirmation #${order._id}</h2>
        <p>Thank you for your order! Here are the details:</p>
        
        <h3>Items</h3>
        <ul>${itemsList}</ul>

        <h3>Total: ₹${order.totalAmount}</h3>
        <p>Payment Method: ${order.paymentMethod}</p>

        <h3>Shipping to:</h3>
        <p>
            ${order.shippingAddress.shipping_name}<br/>
            ${order.shippingAddress.shipping_address_line1}, ${order.shippingAddress.shipping_address_line2 || ''}<br/>
            ${order.shippingAddress.shipping_city} - ${order.shippingAddress.shipping_pincode} (${order.shippingAddress.shipping_state})<br/>
            Phone: ${order.shippingAddress.shipping_phone}
        </p>
    `;
};


// @desc    Create a new Razorpay Order (Public)
// @route   POST /api/orders/razorpay
export const createRazorpayOrder = async (req, res, next) => {
    const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

    const { totalAmount, orderItems, shippingAddress, billingAddress } = req.body;
    const amountInPaisa = totalAmount * 100;

    // 1. Check Product Stock
    const outOfStock = await checkStock(orderItems);
    if (outOfStock.length > 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Some items are out of stock or quantity exceeds available stock.',
            outOfStockItems: outOfStock
        });
    }

    try {
        // 2. Create Razorpay Order
        const options = {
            amount: amountInPaisa,
            currency: 'INR',
            receipt: `receipt_${req.user.id}_${Date.now()}`,
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);

        // 3. Save Pending Payment Record (Snapshot of all data)
        const pendingPayment = await Payment.create({
            user: req.user.id,
            razorpayOrderId: razorpayOrder.id,
            amount: totalAmount,
            orderData: {
                user: req.user.id,
                orderItems,
                totalAmount,
                shippingAddress,
                billingAddress,
            },
        });

        res.status(200).json({ 
            success: true, 
            data: { 
                orderId: razorpayOrder.id, 
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                receipt: pendingPayment._id // Use MongoDB ID for internal tracking
            } 
        });
    } catch (error) {
        console.error("Razorpay/Payment Initiation Error:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create Razorpay Order' });
    }
};


// @desc    Verify Razorpay Payment and Place Order (Public - Called by Razorpay Webhook or Frontend Redirect)
// @route   POST /api/orders/payment-success
export const razorpayPaymentSuccess = async (req, res, next) => {
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
    } = req.body;

    // The order ID we created earlier (from PaymentModel)
    const orderIdFromReceipt = req.body.receipt; 

    try {
        // 1. Verify Payment Signature (CRITICAL SECURITY STEP)
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpay_signature) {
            // Find the pending payment and mark as failed if verification fails
            await Payment.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { status: 'failed', razorpayPaymentId: razorpay_payment_id });
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // 2. Find and Update Payment Record (Mark as Success)
        const paymentRecord = await Payment.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            { 
                status: 'success', 
                razorpayPaymentId: razorpay_payment_id 
            },
            { new: true }
        );

        if (!paymentRecord) {
             return next(new ErrorResponse('Payment record not found.', 404));
        }

        // 3. Create Final Order Document
        const finalOrder = await Order.create({
            ...paymentRecord.orderData,
            paymentMethod: 'Razorpay',
            orderStatus: 'New',
            paymentDetails: {
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                isPaid: true,
                paidAt: Date.now(),
            },
        });

        // Link the final order back to the payment record
        paymentRecord.orderRef = finalOrder._id;
        await paymentRecord.save();

        // 4. Update Product Stock (Decrement stock)
        await updateStock(finalOrder.orderItems);

        // 5. Send Order Confirmation Email
        const userEmail = finalOrder.shippingAddress.shipping_email || finalOrder.billingAddress.billing_email || req.user.email;
        const emailMessage = generateOrderSummary(finalOrder);
        
        await sendEmail({ 
            email: userEmail, 
            subject: `Order Confirmation - #${finalOrder._id}`, 
            message: emailMessage,
            html: emailMessage // Send as HTML for formatting
        });


        res.status(201).json({ success: true, message: 'Order placed and paid successfully', data: finalOrder });

    } catch (err) {
        console.error("Payment Success Error:", err);
        // This is a generic error catch, production code needs more granular handling
        next(err);
    }
};

// @desc    Place a COD Order (Public)
// @route   POST /api/orders/cod
export const placeCODOrder = async (req, res, next) => {
    const { orderItems } = req.body;
    
    // 1. Check Product Stock for COD
    const outOfStock = await checkStock(orderItems);
    if (outOfStock.length > 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Some items are out of stock or quantity exceeds available stock for COD order.',
            outOfStockItems: outOfStock
        });
    }

    try {
        // Order data from frontend should include orderItems, totalAmount, and address fields
        const orderData = {
             ...req.body,
             paymentMethod: 'COD',
             orderStatus: 'New', // COD orders start as 'New'
             user: req.user.id, // Assign to logged-in user
             paymentDetails: {
                 isPaid: false, // COD is not paid initially
             }
        }
        
        const newOrder = await Order.create(orderData);
        
        // 2. Update Product Stock (Decrement stock)
        await updateStock(newOrder.orderItems);

        // 3. Send Order Confirmation Email
        const userEmail = newOrder.shippingAddress.shipping_email || newOrder.billingAddress.billing_email || req.user.email;
        const emailMessage = generateOrderSummary(newOrder);

        await sendEmail({ 
            email: userEmail, 
            subject: `COD Order Placed - #${newOrder._id}`, 
            message: emailMessage,
            html: emailMessage
        });
        
        res.status(201).json({ success: true, message: 'COD Order placed successfully', data: newOrder });
    } catch (err) {
        next(err);
    }
};


// --- Admin Order Management APIs (Assuming they already exist) ---

// @desc    Get all orders (Admin)
// @route   GET /api/orders
export const getAdminOrders = async (req, res, next) => {
    try {
        const orders = await Order.find().populate({
             path: 'user',
             select: 'name email'
         }); 
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single order details (Admin)
// @route   GET /api/orders/:id
export const getAdminOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');

        if (!order) {
            return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
export const updateOrderStatus = async (req, res, next) => {
    const { status } = req.body;
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id, 
            { orderStatus: status },
            { new: true, runValidators: true }
        );

        if (!order) {
            return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
};