import Address from '../models/addressModel.js';
import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';
import ErrorResponse from '../utils/errorResponse.js';

// --- Address Management ---

// @desc    Get all saved addresses for the logged-in user
// @route   GET /api/users/addresses
export const getAddresses = async (req, res, next) => {
    try {
        const addresses = await Address.find({ user: req.user.id });
        res.status(200).json({ success: true, count: addresses.length, data: addresses });
    } catch (err) {
        next(err);
    }
};

// @desc    Add a new address for the logged-in user
// @route   POST /api/users/addresses
export const addAddress = async (req, res, next) => {
    try {
        
        const addressCount = await Address.countDocuments({ user: req.user.id });
        const MAX_ADDRESSES = 5;

        if (addressCount >= MAX_ADDRESSES) {
           // return next(new ErrorResponse(`Maximum address limit (${MAX_ADDRESSES}) reached. Please delete an existing address to add a new one.`, 400));
       // res.status(400).json({ success: false, message: `Maximum address limit (${MAX_ADDRESSES}) reached. Please delete an existing address to add a new one.` });
        return res.status(400).json({ 
                success: false, 
                message: `Maximum address limit (${MAX_ADDRESSES}) reached. Please delete an existing address to add a new one.` 
            });
    }
      
    
        
        const address = await Address.create({ ...req.body, user: req.user.id });
        res.status(201).json({ success: true, data: address });
    } catch (err) {
        next(err);
    }
};

// @desc    Update a specific address
// @route   PUT /api/users/addresses/:id
export const updateAddress = async (req, res, next) => {
    try {
        let address = await Address.findById(req.params.id);

        if (!address || address.user.toString() !== req.user.id) {
            return next(new ErrorResponse(`Address not found or unauthorized`, 404));
        }
        
        address = await Address.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, data: address });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete a specific address
// @route   DELETE /api/users/addresses/:id
export const deleteAddress = async (req, res, next) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address || address.user.toString() !== req.user.id) {
            return next(new ErrorResponse(`Address not found or unauthorized`, 404));
        }

        await Address.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// --- Cart Management ---

// @desc    Get the user's current cart
// @route   GET /api/users/cart
export const getCart = async (req, res, next) => {
    try {
        // Find the user's cart, creating one if it doesn't exist
        let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

        if (!cart) {
             cart = await Cart.create({ user: req.user.id, items: [] });
        }

        res.status(200).json({ success: true, data: cart });
    } catch (err) {
        next(err);
    }
};

// @route   POST /api/users/cart
export const updateCart = async (req, res, next) => {
    // Extract payload from the request body
    const { quantity, size } = req.body;
    let { productId } = req.body; 

    // CRITICAL FIX 1: Ensure productId is always a string ID, even if frontend sends the full object
    if (typeof productId === 'object' && productId !== null && productId._id) {
        productId = productId._id;
    }
    
    // Convert to string immediately for safety in comparisons later
    const productIdStr = String(productId);


    // --- DEBUG LOGS START ---
    // console.log('--- Incoming Cart Update Request ---');
    // console.log('Processed Payload:', { productId: productIdStr, quantity, size });
    // console.log('User ID:', req.user.id);
    // --- DEBUG LOGS END ---

    try {
        let cart = await Cart.findOne({ user: req.user.id });
        const product = await Product.findById(productIdStr); // Use the fixed string ID

        if (!product) {
            return next(new ErrorResponse('Product not found', 404));
        }

        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }
        
        // Find item based on Product ID and Size
        const itemIndex = cart.items.findIndex(
            (item) => {
                // Check if stored product ID (which is an ObjectId) matches the requested string ID
                const isProductMatch = item.product.toString() === productIdStr;
                const isSizeMatch = item.size === size;
                
                // The Product Match was failing because the request payload contained an object.
                // The fix above (CRITICAL FIX 1) should now ensure this is true.
                //console.log(`Checking stored item ${item.product.toString()}: Stored Size="${item.size}", Requested Size="${size}", Product Match=${isProductMatch}, Size Match=${isSizeMatch}`);
                
                return isProductMatch && isSizeMatch;
            }
        );
        
        // --- DEBUG LOGS START ---
       // console.log('Final itemIndex found:', itemIndex);
        // --- DEBUG LOGS END ---


        if (itemIndex > -1) {
            // Item exists (Fix works!)
            cart.items[itemIndex].quantity = quantity;

            // Removal logic: if quantity is 0 or less, remove the item
            if (cart.items[itemIndex].quantity <= 0) {
                 cart.items.splice(itemIndex, 1);
            }
        } else if (quantity > 0) {
            // Item does not exist, add new item
            cart.items.push({
                product: productIdStr, // Use the string ID for consistency
                name: product.name,
                image: product.image,
                price: product.price,
                quantity,
                size,
            });
        }

        // Recalculate total price
        cart.totalPrice = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

        await cart.save();
        
        // Re-populate for the response (Frontend needs this)
        await cart.populate('items.product');

        res.status(200).json({ success: true, data: cart });

    } catch (err) {
        console.error("Cart Update Error:", err);
        next(err);
    }
};

// @desc    Clear the user's cart
// @route   DELETE /api/users/cart
export const clearCart = async (req, res, next) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id });

        if (cart) {
            cart.items = [];
            cart.totalPrice = 0;
            await cart.save();
        }

        res.status(200).json({ success: true, message: 'Cart cleared successfully' });

    } catch (err) {
        next(err);
    }
};