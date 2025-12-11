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

// @desc    Add or update an item in the cart
// @route   POST /api/users/cart
export const updateCart = async (req, res, next) => {
    // Ensure all required fields are used for item identification
    const { productId, quantity, size, colour } = req.body; 

    try {
        let cart = await Cart.findOne({ user: req.user.id });
        const product = await Product.findById(productId);

        if (!product) {
            return next(new ErrorResponse('Product not found', 404));
        }

        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }
        
        // CRITICAL FIX: Find item based on product ID, size, AND colour
        const itemIndex = cart.items.findIndex(
            (item) => 
            item.product.toString() === productId && 
            item.size === size && 
            item.colour === colour // Assuming colour exists and is required for uniqueness
        );
        
        if (itemIndex > -1) {
            // Item exists, update quantity
            cart.items[itemIndex].quantity = quantity;

            // Remove item if quantity is 0 or less
            if (cart.items[itemIndex].quantity <= 0) {
                 cart.items.splice(itemIndex, 1);
            }
        } else if (quantity > 0) {
            // Item does not exist, add new item
            cart.items.push({
                product: productId,
                name: product.name,
                image: product.image,
                price: product.price,
                quantity,
                size,
                colour
            });
        }

        // Recalculate total price
        cart.totalPrice = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

        await cart.save();
        
        // Re-populate for the response (Frontend needs this)
        await cart.populate({
            path: 'items.product', 
            select: 'name image price' // Select only necessary fields
        });


        res.status(200).json({ success: true, data: cart });

    } catch (err) {
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