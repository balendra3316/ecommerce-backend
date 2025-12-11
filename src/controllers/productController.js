import Product from '../models/productModel.js';
import ErrorResponse from '../utils/errorResponse.js'; // Assuming you have a custom error class

// @desc    Get all products (Public)
// @route   GET /api/products
export const getProducts = async (req, res, next) => {
    try {
        const products = await Product.find();
        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single product by ID (Public)
// @route   GET /api/products/:id
export const getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};


// @desc    Create new product (Admin)
// @route   POST /api/products
export const createProduct = async (req, res, next) => {
    try {
        // NOTE: In a full app, you'd add middleware to check if user is an Admin
        // req.user is set by the protect middleware. For now, assuming it's an admin user.
        req.body.user = req.user.id; 
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

// @desc    Update product (Admin)
// @route   PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
    try {
        let product = await Product.findById(req.params.id);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
        }
        
        product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete product (Admin)
// @route   DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
        }
        
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};