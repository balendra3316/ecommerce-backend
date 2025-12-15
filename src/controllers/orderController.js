import Order from '../models/orderModel.js';
import Product from '../models/productModel.js'; // To check/update stock
import Payment from '../models/paymentModel.js'; // To track payment status
import sendEmail from '../config/SendEmail.js';  // To send confirmation email
import ErrorResponse from '../utils/errorResponse.js';
import Razorpay from 'razorpay';
import crypto from 'crypto'; // Node.js built-in module for signature verification






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

const checkStockAndPrice = async (items) => {
    const outOfStockItems = [];
    let calculatedSubtotal = 0;
    const verifiedOrderItems = []; 

    for (const item of items) {
        const productIdToFind = item.product && item.product._id ? item.product._id : item.product;
        const productIdStr = String(productIdToFind);
        
        const product = await Product.findById(productIdStr);
        const itemQuantity = item.quantity;
        
        // 1. Check if product exists and if stock is sufficient
        if (!product || product.stock < itemQuantity) {
            outOfStockItems.push({ 
                name: item.name, 
                requested: itemQuantity, 
                available: product ? product.stock : 0 
            });
        }
        
        // 2. Calculate Subtotal using the price from the database
        const itemPrice = product ? product.price : 0;
        calculatedSubtotal += itemPrice * itemQuantity;

        // 3. Build the complete item structure required by OrderModel
        verifiedOrderItems.push({
            product: productIdStr,
            name: product ? product.name : 'Unknown Product', 
            image: product ? product.image : 'placeholder',     
            price: itemPrice,                                   
            quantity: itemQuantity,
            size: item.size,
        });
    }
    
    return { outOfStockItems, calculatedSubtotal, verifiedOrderItems };
};



export const createRazorpayOrder = async (req, res, next) => {

       const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
   
    const { totalAmount, orderItems, shippingAddress, billingAddress } = req.body;
    
    // 1. Check Product Stock and Price Verification
    const { outOfStockItems, calculatedSubtotal, verifiedOrderItems } = await checkStockAndPrice(orderItems);
    
    if (outOfStockItems.length > 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Some items are out of stock or quantity exceeds available stock.',
            outOfStockItems: outOfStockItems
        });
    }

    if (calculatedSubtotal !== totalAmount) {
         return res.status(400).json({ 
            success: false, 
            message: `Price mismatch: Client sent ₹${totalAmount.toFixed(2)}, Server calculated ₹${calculatedSubtotal.toFixed(2)}.`,
        });
    }
    
    const amountInPaisa = calculatedSubtotal * 100;

    try {
        // 2. Create Razorpay Order
        const receiptId = `rcpt_${req.user.id}_${Date.now()}`; 

        const options = {
            amount: amountInPaisa,
            currency: 'INR',
            receipt: receiptId.substring(0, 40), 
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);
        
        // 3. Return the verified data snapshot for the client to use in the success callback.
        res.status(200).json({ 
            success: true, 
            data: { 
                orderId: razorpayOrder.id, 
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                verifiedOrderData: { // This MUST be passed back by the client on success
                    user: req.user.id,
                    orderItems: verifiedOrderItems, 
                    totalAmount: calculatedSubtotal, 
                    shippingAddress,
                    billingAddress,
                }
            } 
        });
    } catch (error) {
        console.error("Razorpay/Payment Initiation Error:", error); 
        res.status(500).json({ success: false, message: error.error?.description || 'Failed to create Razorpay Order' });
    }
};


// @desc    Verify Razorpay Payment and Place Order (Public)
// @route   POST /api/orders/payment-success
export const razorpayPaymentSuccess = async (req, res, next) => {
    // CRITICAL: Destructure the verifiedOrderData from the body
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        verifiedOrderData, // <-- Expected from the frontend now
    } = req.body;
    
    // 1. CRITICAL: Check for missing data snapshot
    if (!verifiedOrderData || !verifiedOrderData.orderItems || !verifiedOrderData.totalAmount) {
        return res.status(400).json({ success: false, message: 'Missing final order data snapshot for verification.' });
    }

    try {
        // 2. Verify Payment Signature (CRITICAL SECURITY STEP)
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`); 
        const digest = shasum.digest('hex');

        if (digest !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature. Payment failed.' });
        }
        
        // --- Signature Verified: Proceed to Order Fulfillment ---

        // 3. Create Final Order Document
        const finalOrder = await Order.create({
            ...verifiedOrderData, // Contains verified orderItems and totalAmount
            paymentMethod: 'Razorpay',
            orderStatus: 'New',
            paymentDetails: {
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                isPaid: true,
                paidAt: Date.now(),
            },
            user: req.user.id,
        });

        // 4. Update Product Stock (Decrement stock)
        await updateStock(finalOrder.orderItems);

        // 5. Attempt to create Payment Record (Audit/History)
        try {
            await Payment.create({
                user: req.user.id,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                amount: finalOrder.totalAmount,
                status: 'success',
                orderData: verifiedOrderData,
                orderRef: finalOrder._id,
            });
        } catch (paymentError) {
            // Log the error but DO NOT return failure, as the Order is already created.
            console.error("AUDIT WARNING: Failed to create Payment History record after successful Order. Error:", paymentError);
        }
        
        // 6. Send Order Confirmation Email and Return Success
        const userEmail = finalOrder.shippingAddress.shipping_email || finalOrder.billingAddress.billing_email || req.user.email;
        const emailMessage = generateOrderSummary(finalOrder);
        
        await sendEmail({ 
            email: userEmail, 
            subject: `Order Confirmation - #${finalOrder._id}`, 
            html: emailMessage 
        });

        res.status(201).json({ success: true, message: 'Order placed and paid successfully', data: finalOrder });

    } catch (err) {
        console.error("Order Fulfillment Error:", err);
        next(err);
    }
};




// @desc    Place a COD Order (Public)
// @route   POST /api/orders/cod
export const placeCODOrder = async (req, res, next) => {
    const { orderItems, totalAmount, shippingAddress, billingAddress } = req.body;
    
    // 1. Check Product Stock and Price Verification
    const { outOfStockItems, calculatedSubtotal, verifiedOrderItems } = await checkStockAndPrice(orderItems);
    
    if (outOfStockItems.length > 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Some items are out of stock or quantity exceeds available stock for COD order.',
            outOfStockItems: outOfStockItems
        });
    }
    
    // 2. CRITICAL FIX: Verify the client-sent totalAmount matches the server's calculation
    if (calculatedSubtotal !== totalAmount) {
         return res.status(400).json({ 
            success: false, 
            message: `Price mismatch for COD: Client sent ₹${totalAmount.toFixed(2)}, Server calculated ₹${calculatedSubtotal.toFixed(2)}.`,
        });
    }

    try {
        // 3. Order data uses VERIFIED items
        const orderData = {
             orderItems: verifiedOrderItems, // Use verified items
             totalAmount: calculatedSubtotal, // Use verified price
             shippingAddress,
             billingAddress,
             paymentMethod: 'COD',
             orderStatus: 'New', 
             user: req.user.id, 
             paymentDetails: {
                 isPaid: false, 
             }
        }
        
        const newOrder = await Order.create(orderData);
        
        // 4. Update Product Stock (Decrement stock)
        await updateStock(newOrder.orderItems);

        // 5. Send Order Confirmation Email
        const userEmail = newOrder.shippingAddress.shipping_email || newOrder.billingAddress.billing_email || req.user.email;
        const emailMessage = generateOrderSummary(newOrder);

        await sendEmail({ 
            email: userEmail, 
            subject: `COD Order Placed - #${newOrder._id}`, 
            html: emailMessage
        });
        
        res.status(201).json({ success: true, message: 'COD Order placed successfully', data: newOrder });
    } catch (err) {
        console.error("COD Order Error:", err);
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



// Inside src/controllers/orderController.js
export const getUserOrders = async (req, res, next) => {
    try {
        // Correctly queries based on the logged-in user ID
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        next(err);
    }
};